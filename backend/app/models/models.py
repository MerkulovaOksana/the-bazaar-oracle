from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    telegram_id: Mapped[int | None] = mapped_column(Integer, nullable=True, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    predictions: Mapped[list["Prediction"]] = relationship(back_populates="user")
    chat_messages: Mapped[list["ChatMessage"]] = relationship(back_populates="user")
    analytics_events: Mapped[list["AnalyticsEvent"]] = relationship(back_populates="user")


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    player_items: Mapped[dict] = mapped_column(JSON)
    monster_name: Mapped[str] = mapped_column(String(100))
    monster_items: Mapped[dict] = mapped_column(JSON)

    predicted_winner: Mapped[str] = mapped_column(String(20))
    player_hp_remaining: Mapped[float] = mapped_column(Float)
    monster_hp_remaining: Mapped[float] = mapped_column(Float)
    battle_time_ms: Mapped[int] = mapped_column(Integer)
    cast_log_summary: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    source: Mapped[str] = mapped_column(String(20), default="web")  # web | telegram | api

    user: Mapped["User"] = relationship(back_populates="predictions")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    role: Mapped[str] = mapped_column(String(20))  # user | assistant
    content: Mapped[str] = mapped_column(Text)
    input_type: Mapped[str] = mapped_column(String(20), default="text")  # text | voice

    user: Mapped["User"] = relationship(back_populates="chat_messages")


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    event_type: Mapped[str] = mapped_column(String(50), index=True)
    event_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    user: Mapped["User | None"] = relationship(back_populates="analytics_events")
