from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..services.auth import (
    create_user, get_user_by_username, verify_password, create_token, decode_token,
)
from ..models.models import AnalyticsEvent

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str
    password: str
    email: str | None = None


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    user_id: int


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await get_user_by_username(db, req.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")

    user = await create_user(db, req.username, req.password, req.email)

    db.add(AnalyticsEvent(user_id=user.id, event_type="registration"))
    await db.commit()

    token = create_token(user.id, user.username)
    return TokenResponse(access_token=token, username=user.username, user_id=user.id)


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_username(db, req.username)
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    db.add(AnalyticsEvent(user_id=user.id, event_type="login"))
    await db.commit()

    token = create_token(user.id, user.username)
    return TokenResponse(access_token=token, username=user.username, user_id=user.id)
