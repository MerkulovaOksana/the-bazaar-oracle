"""
Screenshot parser using GPT-4o Vision.
Extracts player items, monster info, and HP from a game screenshot.
"""

import base64
import json
from typing import Optional

from openai import AsyncOpenAI

from ..config import get_settings

settings = get_settings()

VISION_PROMPT = """You are analyzing a screenshot from the game "The Bazaar" (an auto-battler card game).

Identify the following from the screenshot:
1. Player's hero name and HP (if visible)
2. Player's items on the board (name each item you can see)
3. Monster/opponent name and HP (if visible)
4. Monster/opponent items on the board

Return a JSON object with this exact structure:
{
  "player": {
    "hero_name": "string or null",
    "hp": number or null,
    "items": ["item_name_1", "item_name_2", ...]
  },
  "monster": {
    "name": "string or null", 
    "hp": number or null,
    "items": ["item_name_1", "item_name_2", ...]
  },
  "confidence": "high" | "medium" | "low",
  "notes": "any additional observations"
}

If you cannot identify specific items, describe them as best you can (e.g. "unknown_sword", "healing_item").
Focus on accuracy — it's better to say "unknown" than to guess wrong."""


async def parse_screenshot(image_bytes: bytes, mime_type: str = "image/png") -> dict:
    """Parse a game screenshot using GPT-4o Vision."""
    client = AsyncOpenAI(api_key=settings.openai_api_key)

    b64_image = base64.b64encode(image_bytes).decode("utf-8")

    response = await client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": VISION_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{b64_image}",
                            "detail": "high",
                        },
                    },
                ],
            }
        ],
        max_tokens=1000,
        temperature=0.1,
    )

    raw = response.choices[0].message.content
    # Extract JSON from possible markdown code block
    if "```json" in raw:
        raw = raw.split("```json")[1].split("```")[0]
    elif "```" in raw:
        raw = raw.split("```")[1].split("```")[0]

    return json.loads(raw.strip())


def match_items_to_catalog(parsed_items: list[str], catalog: dict) -> list[str]:
    """Fuzzy-match parsed item names to catalog IDs."""
    matched = []
    catalog_names = {v["name"].lower(): k for k, v in catalog.items()}

    for item_name in parsed_items:
        name_lower = item_name.lower().strip()
        if name_lower in catalog_names:
            matched.append(catalog_names[name_lower])
        else:
            # Try partial match
            best_match = None
            best_score = 0
            for cat_name, cat_id in catalog_names.items():
                common = len(set(name_lower.split()) & set(cat_name.split()))
                if common > best_score:
                    best_score = common
                    best_match = cat_id
            if best_match and best_score > 0:
                matched.append(best_match)
            else:
                matched.append("sword")  # generic fallback when vision name is not in catalog

    return matched
