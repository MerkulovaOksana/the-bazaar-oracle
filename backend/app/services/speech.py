"""
Speech-to-text service using OpenAI Whisper API.
"""

import io
from openai import AsyncOpenAI
from ..config import get_settings

settings = get_settings()


async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """Transcribe audio bytes to text using Whisper."""
    client = AsyncOpenAI(api_key=settings.openai_api_key)

    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = filename

    transcript = await client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file,
        language="ru",
    )

    return transcript.text
