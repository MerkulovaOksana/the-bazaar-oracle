import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db
from .routers import auth, predict, chat, analytics

logger = logging.getLogger(__name__)


async def _run_telegram_bot() -> None:
    """Start the Telegram bot polling in background (best-effort)."""
    from .config import get_settings

    token = get_settings().telegram_bot_token
    if not token:
        logger.info("TELEGRAM_BOT_TOKEN not set; Telegram bot disabled.")
        return

    try:
        from telegram import Update
        from telegram.ext import (
            Application,
            CommandHandler,
            MessageHandler,
            filters,
        )
    except ImportError:
        logger.warning("python-telegram-bot not installed; Telegram bot disabled.")
        return

    # Import handlers from bot module (one level above backend package).
    import importlib, sys
    from pathlib import Path

    bot_dir = Path(__file__).resolve().parent.parent.parent / "bot"
    if str(bot_dir) not in sys.path:
        sys.path.insert(0, str(bot_dir))

    try:
        import telegram_bot as tg
    except Exception as exc:
        logger.error("Could not import bot/telegram_bot.py: %s", exc)
        return

    tg_app = Application.builder().token(token).build()
    tg_app.add_handler(CommandHandler("start", tg.start))
    tg_app.add_handler(CommandHandler("help", tg.help_cmd))
    tg_app.add_handler(CommandHandler("monsters", tg.monsters_cmd))
    tg_app.add_handler(CommandHandler("items", tg.items_cmd))
    tg_app.add_handler(CommandHandler("predict", tg.predict_cmd))
    tg_app.add_handler(MessageHandler(filters.PHOTO, tg.handle_photo))

    logger.info("Starting Telegram bot polling (background)...")
    await tg_app.initialize()
    await tg_app.start()
    await tg_app.updater.start_polling(allowed_updates=Update.ALL_TYPES)


async def _stop_telegram_bot(tg_task: asyncio.Task | None) -> None:
    if tg_task is None:
        return
    tg_task.cancel()
    try:
        await tg_task
    except (asyncio.CancelledError, Exception):
        pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    tg_task = asyncio.create_task(_run_telegram_bot())
    yield
    await _stop_telegram_bot(tg_task)


app = FastAPI(
    title="The Bazaar Oracle API",
    description="The Bazaar PvE battle predictor",
    version="0.1.0",
    lifespan=lifespan,
)

allowed_origins = {
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
}
frontend_urls = os.getenv("FRONTEND_URL", "")
if frontend_urls:
    for origin in frontend_urls.split(","):
        cleaned = origin.strip().rstrip("/")
        if cleaned:
            allowed_origins.add(cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(allowed_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(predict.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "the-bazaar-oracle"}
