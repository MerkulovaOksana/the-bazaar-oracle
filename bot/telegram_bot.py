"""
Telegram bot for Battle Oracle.
Send a screenshot -> get a battle prediction.
"""

import asyncio
import logging
import sys
import os
import httpx

from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    filters,
    ContextTypes,
)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from backend.app.config import get_settings
from backend.app.services.predictor import run_simulation, run_simulation_from_preset
from backend.app.services.vision import parse_screenshot, match_items_to_catalog
from backend.app.simulation.items_catalog import ITEMS_CATALOG, MONSTERS

settings = get_settings()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Battle Oracle\n\n"
        "Send me a screenshot from The Bazaar PvE battle, "
        "and I'll predict whether you win or lose!\n\n"
        "Commands:\n"
        "/predict <items> vs <monster> — manual prediction\n"
        "/monsters — list available monsters\n"
        "/items — list available items\n"
        "/help — show this message"
    )


async def help_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await start(update, context)


async def monsters_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = "Available monsters:\n\n"
    for m_id, m in MONSTERS.items():
        text += f"• {m['name']} (HP: {m['hp']}) — `{m_id}`\n"
    await update.message.reply_text(text, parse_mode="Markdown")


async def items_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = "Available items:\n\n"
    for item_id, item in ITEMS_CATALOG.items():
        text += f"• {item['name']} ({item['tier']}) — `{item_id}`\n"
    await update.message.reply_text(text, parse_mode="Markdown")


async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle screenshot uploads."""
    await update.message.reply_text("Analyzing your screenshot...")

    photo = update.message.photo[-1]
    file = await context.bot.get_file(photo.file_id)

    async with httpx.AsyncClient() as client:
        response = await client.get(file.file_path)
        image_bytes = response.content

    try:
        parsed = await parse_screenshot(image_bytes, "image/jpeg")
        player_items = match_items_to_catalog(
            parsed.get("player", {}).get("items", []), ITEMS_CATALOG
        )
        monster_items = match_items_to_catalog(
            parsed.get("monster", {}).get("items", []), ITEMS_CATALOG
        )

        result = run_simulation(
            player_item_ids=player_items,
            player_hp=float(parsed.get("player", {}).get("hp") or 500),
            monster_item_ids=monster_items,
            monster_hp=float(parsed.get("monster", {}).get("hp") or 400),
            monster_name=parsed.get("monster", {}).get("name") or "Monster",
        )

        emoji = "✅" if result["player_wins"] else "❌"
        text = (
            f"{emoji} **{'VICTORY' if result['player_wins'] else 'DEFEAT'}**\n\n"
            f"vs {result['monster_name']}\n"
            f"Your HP: {result['player_hp_remaining']}/{result['player_hp_max']}\n"
            f"Monster HP: {result['monster_hp_remaining']}/{result['monster_hp_max']}\n"
            f"Battle time: {result['battle_time_ms']}ms\n"
            f"Total casts: {result['total_casts']}\n\n"
            f"Confidence: {parsed.get('confidence', 'unknown')}"
        )
        await update.message.reply_text(text, parse_mode="Markdown")

    except Exception as e:
        logger.error(f"Prediction error: {e}")
        await update.message.reply_text(
            f"Could not analyze the screenshot. Error: {str(e)[:200]}\n\n"
            "Try /predict command for manual input."
        )


async def predict_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Manual prediction: /predict iron_sword,void_dagger vs goblin_scout"""
    args = " ".join(context.args) if context.args else ""

    if "vs" not in args:
        await update.message.reply_text(
            "Usage: `/predict item1,item2 vs monster_id`\n"
            "Example: `/predict iron_sword,void_dagger vs goblin_scout`",
            parse_mode="Markdown",
        )
        return

    parts = args.split("vs")
    player_items = [i.strip() for i in parts[0].strip().split(",")]
    monster_id = parts[1].strip()

    result = run_simulation_from_preset(
        player_item_ids=player_items,
        player_hp=500,
        monster_id=monster_id,
    )

    if "error" in result:
        await update.message.reply_text(f"Error: {result['error']}")
        return

    emoji = "✅" if result["player_wins"] else "❌"
    text = (
        f"{emoji} **{'VICTORY' if result['player_wins'] else 'DEFEAT'}**\n\n"
        f"vs {result['monster_name']}\n"
        f"Your HP: {result['player_hp_remaining']}/{result['player_hp_max']}\n"
        f"Monster HP: {result['monster_hp_remaining']}/{result['monster_hp_max']}\n"
        f"Battle time: {result['battle_time_ms']}ms\n"
        f"Total casts: {result['total_casts']}"
    )
    await update.message.reply_text(text, parse_mode="Markdown")


def main():
    if not settings.telegram_bot_token:
        print("Set TELEGRAM_BOT_TOKEN in .env")
        return

    app = Application.builder().token(settings.telegram_bot_token).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_cmd))
    app.add_handler(CommandHandler("monsters", monsters_cmd))
    app.add_handler(CommandHandler("items", items_cmd))
    app.add_handler(CommandHandler("predict", predict_cmd))
    app.add_handler(MessageHandler(filters.PHOTO, handle_photo))

    print("Bot started. Polling...")
    app.run_polling()


if __name__ == "__main__":
    main()
