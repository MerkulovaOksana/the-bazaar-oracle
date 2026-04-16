"""
Telegram bot for The Bazaar Oracle.
Send a screenshot -> get a battle prediction.
"""

import asyncio
import logging
import sys
import os
import httpx

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
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

TIER_EMOJI = {
    "bronze": "\U0001f7e4",
    "silver": "\u26aa",
    "gold": "\U0001f7e1",
    "diamond": "\U0001f535",
    "legendary": "\U0001f7e3",
}


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "\u2694\ufe0f *The Bazaar Oracle* \u2694\ufe0f\n\n"
        "\U0001f52e \u041f\u0440\u0435\u0434\u0441\u043a\u0430\u0437\u0430\u0442\u0435\u043b\u044c PvE-\u0431\u043e\u0451\u0432 \u0432 The Bazaar\n\n"
        "\U0001f4f8 *\u041e\u0442\u043f\u0440\u0430\u0432\u044c \u0441\u043a\u0440\u0438\u043d\u0448\u043e\u0442* \u0431\u043e\u044f \u2014 \u044f \u0440\u0430\u0441\u043f\u043e\u0437\u043d\u0430\u044e \u0434\u043e\u0441\u043a\u0438 \u0438 \u043f\u0440\u0435\u0434\u0441\u043a\u0430\u0436\u0443 \u0438\u0441\u0445\u043e\u0434!\n\n"
        "\U0001f3ae *\u041a\u043e\u043c\u0430\u043d\u0434\u044b:*\n"
        "/monsters \u2014 \u0441\u043f\u0438\u0441\u043e\u043a \u043c\u043e\u043d\u0441\u0442\u0440\u043e\u0432\n"
        "/items \u2014 \u0441\u043f\u0438\u0441\u043e\u043a \u043f\u0440\u0435\u0434\u043c\u0435\u0442\u043e\u0432\n"
        "/predict \u2014 \u0440\u0443\u0447\u043d\u043e\u0435 \u043f\u0440\u0435\u0434\u0441\u043a\u0430\u0437\u0430\u043d\u0438\u0435\n"
        "/help \u2014 \u043f\u043e\u043c\u043e\u0449\u044c",
        parse_mode="Markdown",
    )


async def help_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "\U0001f4d6 *\u041a\u0430\u043a \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u044c\u0441\u044f:*\n\n"
        "*1\ufe0f\u20e3 \u0421\u043a\u0440\u0438\u043d\u0448\u043e\u0442:* \u041f\u0440\u043e\u0441\u0442\u043e \u043e\u0442\u043f\u0440\u0430\u0432\u044c \u0444\u043e\u0442\u043e \u044d\u043a\u0440\u0430\u043d\u0430 \u0431\u043e\u044f.\n"
        "GPT-4 Vision \u0440\u0430\u0441\u043f\u043e\u0437\u043d\u0430\u0435\u0442 \u043f\u0440\u0435\u0434\u043c\u0435\u0442\u044b \u0438 \u0441\u0438\u043c\u0443\u043b\u0438\u0440\u0443\u0435\u0442 \u0431\u043e\u0439.\n\n"
        "*2\ufe0f\u20e3 \u0412\u0440\u0443\u0447\u043d\u0443\u044e:*\n"
        "`/predict sword,twin_daggers vs pyro`\n\n"
        "*\u0421\u043f\u0438\u0441\u043a\u0438:*\n"
        "/monsters \u2014 \u0432\u0441\u0435 \u043c\u043e\u043d\u0441\u0442\u0440\u044b \u0441 HP \u0438 \u0434\u043d\u044f\u043c\u0438\n"
        "/items \u2014 \u0432\u0441\u0435 \u043f\u0440\u0435\u0434\u043c\u0435\u0442\u044b \u0441 \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u044f\u043c\u0438\n\n"
        "\U0001f310 \u0412\u0435\u0431-\u043f\u0440\u0438\u043b\u043e\u0436\u0435\u043d\u0438\u0435: the-bazaar-oracle.vercel.app",
        parse_mode="Markdown",
    )


async def monsters_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = "\U0001f409 *\u041c\u043e\u043d\u0441\u0442\u0440\u044b The Bazaar:*\n\n"
    for m_id, m in MONSTERS.items():
        tier_emoji = TIER_EMOJI.get(m.get("tier", ""), "")
        day = m.get("day", "?")
        text += (
            f"{tier_emoji} *{m['name']}* \u2014 {m['hp']} HP\n"
            f"    Day {day} \u2022 {m.get('tier', '').title()} \u2022 `{m_id}`\n\n"
        )
    text += "\u2139\ufe0f \u0418\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0439 ID \u0434\u043b\u044f /predict"
    await update.message.reply_text(text, parse_mode="Markdown")


async def items_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    categories = {}
    for item_id, item in ITEMS_CATALOG.items():
        cat = item.get("category", "other")
        if cat not in categories:
            categories[cat] = []
        categories[cat].append((item_id, item))

    cat_names = {
        "weapon": "\u2694\ufe0f \u041e\u0440\u0443\u0436\u0438\u0435",
        "potion": "\U0001f9ea \u0417\u0435\u043b\u044c\u044f",
        "apparel": "\U0001f6e1\ufe0f \u0417\u0430\u0449\u0438\u0442\u0430",
        "property": "\U0001f3f0 \u0421\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u044b",
        "tool": "\U0001f527 \u0418\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u044b",
    }

    text = "\U0001f4e6 *\u041f\u0440\u0435\u0434\u043c\u0435\u0442\u044b:*\n\n"
    for cat, items in categories.items():
        text += f"*{cat_names.get(cat, cat)}*\n"
        for item_id, item in items:
            tier_emoji = TIER_EMOJI.get(item.get("tier", ""), "")
            text += f"{tier_emoji} `{item_id}` \u2014 {item['name']}\n"
            text += f"    _{item.get('desc', '')}_\n"
        text += "\n"

    text += "\u2139\ufe0f \u0418\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0439 ID \u0434\u043b\u044f /predict"
    await update.message.reply_text(text, parse_mode="Markdown")


async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle screenshot uploads — analyze with GPT-4 Vision and simulate."""
    msg = await update.message.reply_text(
        "\U0001f50d \u0410\u043d\u0430\u043b\u0438\u0437\u0438\u0440\u0443\u044e \u0441\u043a\u0440\u0438\u043d\u0448\u043e\u0442..."
    )

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

        emoji = "\u2705" if result["player_wins"] else "\u274c"
        outcome = "\u041f\u041e\u0411\u0415\u0414\u0410" if result["player_wins"] else "\u041f\u041e\u0420\u0410\u0416\u0415\u041d\u0418\u0415"

        hp_bar_player = _hp_bar(result["player_hp_remaining"], result["player_hp_max"])
        hp_bar_monster = _hp_bar(result["monster_hp_remaining"], result["monster_hp_max"])

        text = (
            f"{emoji} *{outcome}* vs {result['monster_name']}\n\n"
            f"\U0001f464 \u0418\u0433\u0440\u043e\u043a: {result['player_hp_remaining']}/{result['player_hp_max']} HP\n"
            f"{hp_bar_player}\n"
            f"\U0001f47e {result['monster_name']}: {result['monster_hp_remaining']}/{result['monster_hp_max']} HP\n"
            f"{hp_bar_monster}\n\n"
            f"\u23f1 \u0412\u0440\u0435\u043c\u044f: {result['battle_time_ms'] / 1000:.1f}s\n"
            f"\u2728 \u041a\u0430\u0441\u0442\u043e\u0432: {result['total_casts']}\n"
        )

        if result.get("player_shield", 0) > 0:
            text += f"\U0001f6e1 \u0429\u0438\u0442 \u0438\u0433\u0440\u043e\u043a\u0430: {result['player_shield']}\n"
        if result.get("monster_burn", 0) > 0:
            text += f"\U0001f525 Burn: {result['monster_burn']}\n"
        if result.get("monster_poison", 0) > 0:
            text += f"\u2620\ufe0f Poison: {result['monster_poison']}\n"

        text += f"\n\U0001f4ca \u0422\u043e\u0447\u043d\u043e\u0441\u0442\u044c: {parsed.get('confidence', '?')}"

        await context.bot.edit_message_text(
            chat_id=msg.chat_id,
            message_id=msg.message_id,
            text=text,
            parse_mode="Markdown",
        )

    except Exception as e:
        logger.error(f"Prediction error: {e}")
        await context.bot.edit_message_text(
            chat_id=msg.chat_id,
            message_id=msg.message_id,
            text=(
                f"\u26a0\ufe0f \u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u0440\u043e\u0430\u043d\u0430\u043b\u0438\u0437\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0441\u043a\u0440\u0438\u043d\u0448\u043e\u0442.\n"
                f"\u041e\u0448\u0438\u0431\u043a\u0430: {str(e)[:200]}\n\n"
                "\u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439 /predict \u0434\u043b\u044f \u0440\u0443\u0447\u043d\u043e\u0433\u043e \u0432\u0432\u043e\u0434\u0430."
            ),
        )


async def predict_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Manual prediction: /predict sword,twin_daggers vs pyro"""
    args = " ".join(context.args) if context.args else ""

    if "vs" not in args:
        await update.message.reply_text(
            "\u2694\ufe0f *\u0420\u0443\u0447\u043d\u043e\u0435 \u043f\u0440\u0435\u0434\u0441\u043a\u0430\u0437\u0430\u043d\u0438\u0435*\n\n"
            "\u0424\u043e\u0440\u043c\u0430\u0442: `/predict item1,item2 vs monster_id`\n\n"
            "\u041f\u0440\u0438\u043c\u0435\u0440\u044b:\n"
            "`/predict sword,twin_daggers vs pyro`\n"
            "`/predict flame_blade,aegis_barrier vs dragon`\n"
            "`/predict apocalypse_blade,holy_grail vs zookeeper`\n\n"
            "\U0001f4cb /monsters \u2014 \u0441\u043f\u0438\u0441\u043e\u043a \u043c\u043e\u043d\u0441\u0442\u0440\u043e\u0432\n"
            "\U0001f4cb /items \u2014 \u0441\u043f\u0438\u0441\u043e\u043a \u043f\u0440\u0435\u0434\u043c\u0435\u0442\u043e\u0432",
            parse_mode="Markdown",
        )
        return

    parts = args.split("vs")
    player_items = [i.strip() for i in parts[0].strip().split(",") if i.strip()]
    monster_id = parts[1].strip()

    invalid_items = [i for i in player_items if i not in ITEMS_CATALOG]
    if invalid_items:
        await update.message.reply_text(
            f"\u274c \u041d\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043d\u044b\u0435 \u043f\u0440\u0435\u0434\u043c\u0435\u0442\u044b: {', '.join(invalid_items)}\n"
            "\u0421\u043c\u043e\u0442\u0440\u0438 /items \u0434\u043b\u044f \u0441\u043f\u0438\u0441\u043a\u0430."
        )
        return

    if monster_id not in MONSTERS:
        await update.message.reply_text(
            f"\u274c \u041d\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043d\u044b\u0439 \u043c\u043e\u043d\u0441\u0442\u0440: {monster_id}\n"
            "\u0421\u043c\u043e\u0442\u0440\u0438 /monsters \u0434\u043b\u044f \u0441\u043f\u0438\u0441\u043a\u0430."
        )
        return

    result = run_simulation_from_preset(
        player_item_ids=player_items,
        player_hp=500,
        monster_id=monster_id,
    )

    if "error" in result:
        await update.message.reply_text(f"\u274c \u041e\u0448\u0438\u0431\u043a\u0430: {result['error']}")
        return

    emoji = "\u2705" if result["player_wins"] else "\u274c"
    outcome = "\u041f\u041e\u0411\u0415\u0414\u0410" if result["player_wins"] else "\u041f\u041e\u0420\u0410\u0416\u0415\u041d\u0418\u0415"

    hp_bar_player = _hp_bar(result["player_hp_remaining"], result["player_hp_max"])
    hp_bar_monster = _hp_bar(result["monster_hp_remaining"], result["monster_hp_max"])

    items_text = ", ".join(
        ITEMS_CATALOG.get(i, {}).get("name", i) for i in player_items
    )

    text = (
        f"{emoji} *{outcome}* vs {result['monster_name']}\n\n"
        f"\U0001f3ae \u0422\u0432\u043e\u0438 \u043f\u0440\u0435\u0434\u043c\u0435\u0442\u044b: {items_text}\n\n"
        f"\U0001f464 \u0418\u0433\u0440\u043e\u043a: {result['player_hp_remaining']}/{result['player_hp_max']} HP\n"
        f"{hp_bar_player}\n"
        f"\U0001f47e {result['monster_name']}: {result['monster_hp_remaining']}/{result['monster_hp_max']} HP\n"
        f"{hp_bar_monster}\n\n"
        f"\u23f1 \u0412\u0440\u0435\u043c\u044f: {result['battle_time_ms'] / 1000:.1f}s\n"
        f"\u2728 \u041a\u0430\u0441\u0442\u043e\u0432: {result['total_casts']}"
    )

    if result.get("player_shield", 0) > 0:
        text += f"\n\U0001f6e1 \u0429\u0438\u0442: {result['player_shield']}"
    if result.get("monster_burn", 0) > 0:
        text += f"\n\U0001f525 Burn: {result['monster_burn']}"
    if result.get("monster_poison", 0) > 0:
        text += f"\n\u2620\ufe0f Poison: {result['monster_poison']}"

    await update.message.reply_text(text, parse_mode="Markdown")


def _hp_bar(current: float, maximum: float, length: int = 10) -> str:
    """Generate a visual HP bar."""
    if maximum <= 0:
        return "\u2581" * length
    ratio = max(0, min(1, current / maximum))
    filled = round(ratio * length)
    return "\U0001f7e9" * filled + "\u2b1c" * (length - filled)


def main():
    token = settings.telegram_bot_token
    if not token:
        print("\u274c TELEGRAM_BOT_TOKEN \u043d\u0435 \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d \u0432 .env")
        print("\u0421\u043e\u0437\u0434\u0430\u0439 \u0431\u043e\u0442\u0430 \u0447\u0435\u0440\u0435\u0437 @BotFather \u0438 \u0434\u043e\u0431\u0430\u0432\u044c \u0442\u043e\u043a\u0435\u043d.")
        return

    app = Application.builder().token(token).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_cmd))
    app.add_handler(CommandHandler("monsters", monsters_cmd))
    app.add_handler(CommandHandler("items", items_cmd))
    app.add_handler(CommandHandler("predict", predict_cmd))
    app.add_handler(MessageHandler(filters.PHOTO, handle_photo))

    logger.info("The Bazaar Oracle Bot \u0437\u0430\u043f\u0443\u0449\u0435\u043d!")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
