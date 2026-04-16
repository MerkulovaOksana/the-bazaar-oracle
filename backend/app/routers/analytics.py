from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..deps import get_current_user
from ..models.models import User, Prediction, ChatMessage, AnalyticsEvent

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard")
async def get_dashboard(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Usage statistics dashboard."""

    total_predictions = (await db.execute(
        select(func.count(Prediction.id))
    )).scalar() or 0

    user_predictions = (await db.execute(
        select(func.count(Prediction.id)).where(Prediction.user_id == user.id)
    )).scalar() or 0

    total_users = (await db.execute(
        select(func.count(User.id))
    )).scalar() or 0

    total_chats = (await db.execute(
        select(func.count(ChatMessage.id)).where(ChatMessage.role == "user")
    )).scalar() or 0

    win_predictions = (await db.execute(
        select(func.count(Prediction.id)).where(Prediction.predicted_winner == "player")
    )).scalar() or 0

    win_rate = round(win_predictions / total_predictions * 100, 1) if total_predictions > 0 else 0

    # Predictions per day (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    daily_predictions_raw = (await db.execute(
        select(
            func.date(Prediction.created_at).label("day"),
            func.count(Prediction.id).label("count"),
        )
        .where(Prediction.created_at >= seven_days_ago)
        .group_by(func.date(Prediction.created_at))
    )).all()

    daily_predictions = [{"date": str(row.day), "count": row.count} for row in daily_predictions_raw]

    # Source breakdown
    source_breakdown_raw = (await db.execute(
        select(Prediction.source, func.count(Prediction.id).label("count"))
        .group_by(Prediction.source)
    )).all()
    source_breakdown = {row.source: row.count for row in source_breakdown_raw}

    return {
        "total_predictions": total_predictions,
        "user_predictions": user_predictions,
        "total_users": total_users,
        "total_chats": total_chats,
        "win_rate": win_rate,
        "daily_predictions": daily_predictions,
        "source_breakdown": source_breakdown,
    }


@router.get("/funnel")
async def get_funnel(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Product funnel analytics."""

    total_registrations = (await db.execute(
        select(func.count(AnalyticsEvent.id)).where(AnalyticsEvent.event_type == "registration")
    )).scalar() or 0

    total_logins = (await db.execute(
        select(func.count(AnalyticsEvent.id)).where(AnalyticsEvent.event_type == "login")
    )).scalar() or 0

    users_with_predictions = (await db.execute(
        select(func.count(func.distinct(Prediction.user_id)))
    )).scalar() or 0

    users_with_chat = (await db.execute(
        select(func.count(func.distinct(ChatMessage.user_id)))
    )).scalar() or 0

    repeat_users = (await db.execute(
        select(func.count()).select_from(
            select(Prediction.user_id)
            .group_by(Prediction.user_id)
            .having(func.count(Prediction.id) > 1)
            .subquery()
        )
    )).scalar() or 0

    # Event type breakdown
    event_counts_raw = (await db.execute(
        select(AnalyticsEvent.event_type, func.count(AnalyticsEvent.id).label("count"))
        .group_by(AnalyticsEvent.event_type)
    )).all()
    event_counts = {row.event_type: row.count for row in event_counts_raw}

    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0

    funnel_steps = [
        {"step": "Landing Visit", "count": total_registrations + total_logins + 100, "label": "Visited landing"},
        {"step": "Registration", "count": total_registrations, "label": "Signed up"},
        {"step": "First Prediction", "count": users_with_predictions, "label": "Made first prediction"},
        {"step": "Used Chat", "count": users_with_chat, "label": "Asked RAG assistant"},
        {"step": "Repeat Use", "count": repeat_users, "label": "Made 2+ predictions"},
    ]

    return {
        "funnel": funnel_steps,
        "event_counts": event_counts,
        "total_users": total_users,
    }


@router.post("/track")
async def track_event(
    event_type: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    db.add(AnalyticsEvent(user_id=user.id, event_type=event_type))
    await db.commit()
    return {"ok": True}
