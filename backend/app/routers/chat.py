from fastapi import APIRouter, Depends, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..deps import get_current_user
from ..models.models import User, ChatMessage, AnalyticsEvent
from ..rag.assistant import chat_with_rag
from ..services.speech import transcribe_audio

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    history: list[dict] | None = None


class ChatResponse(BaseModel):
    reply: str
    input_type: str = "text"


@router.post("/message", response_model=ChatResponse)
async def send_message(
    req: ChatRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    reply = await chat_with_rag(req.message, req.history)

    db.add(ChatMessage(user_id=user.id, role="user", content=req.message, input_type="text"))
    db.add(ChatMessage(user_id=user.id, role="assistant", content=reply, input_type="text"))
    db.add(AnalyticsEvent(user_id=user.id, event_type="chat_message"))
    await db.commit()

    return ChatResponse(reply=reply)


@router.post("/voice", response_model=ChatResponse)
async def send_voice(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    audio_bytes = await file.read()
    transcript = await transcribe_audio(audio_bytes, file.filename or "audio.webm")

    reply = await chat_with_rag(transcript)

    db.add(ChatMessage(user_id=user.id, role="user", content=transcript, input_type="voice"))
    db.add(ChatMessage(user_id=user.id, role="assistant", content=reply, input_type="text"))
    db.add(AnalyticsEvent(user_id=user.id, event_type="chat_voice"))
    await db.commit()

    return ChatResponse(reply=reply, input_type="voice")
