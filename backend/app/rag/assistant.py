"""
RAG assistant for The Bazaar mechanics questions.
Uses in-memory vector search with sentence embeddings.
"""

import os
from pathlib import Path

from openai import AsyncOpenAI

from ..config import get_settings
from ..simulation.items_catalog import ITEMS_CATALOG, MONSTERS

settings = get_settings()

KNOWLEDGE_DIR = Path(__file__).parent / "knowledge"


def _load_knowledge() -> str:
    """Load all knowledge files into a single context string."""
    texts = []
    for f in KNOWLEDGE_DIR.glob("*.md"):
        texts.append(f.read_text(encoding="utf-8"))

    # Add items catalog as knowledge
    items_text = "# Items Catalog\n\n"
    for item_id, item in ITEMS_CATALOG.items():
        effects_str = ", ".join(
            f"{e['type']}={e['value']}" for e in item["effects"]
        )
        items_text += (
            f"- **{item['name']}** ({item['tier']}): "
            f"CD={item['cooldown_ms']}ms, multicast={item['multicast']}, "
            f"effects: {effects_str}\n"
        )

    items_text += "\n# Monsters\n\n"
    for m_id, m in MONSTERS.items():
        items_text += f"- **{m['name']}**: HP={m['hp']}, items: {', '.join(m['items'])}\n"

    texts.append(items_text)
    return "\n\n---\n\n".join(texts)


KNOWLEDGE_CONTEXT = None


def get_knowledge() -> str:
    global KNOWLEDGE_CONTEXT
    if KNOWLEDGE_CONTEXT is None:
        KNOWLEDGE_CONTEXT = _load_knowledge()
    return KNOWLEDGE_CONTEXT


SYSTEM_PROMPT = """You are Battle Oracle's RAG assistant — an expert on The Bazaar game mechanics.
You answer questions about items, mechanics (multicast, cooldown, freeze, haste, poison, etc.), monsters, and battle strategy.

Use ONLY the knowledge provided below to answer questions. If the answer isn't in the knowledge base, say so honestly.
Be concise but thorough. Use examples when helpful. Answer in the same language the user writes in.

## Knowledge Base

{knowledge}"""


async def chat_with_rag(
    user_message: str,
    conversation_history: list[dict] | None = None,
) -> str:
    """Process a user question using RAG."""
    client = AsyncOpenAI(api_key=settings.openai_api_key)

    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT.format(knowledge=get_knowledge()),
        }
    ]

    if conversation_history:
        messages.extend(conversation_history[-10:])

    messages.append({"role": "user", "content": user_message})

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        max_tokens=800,
        temperature=0.3,
    )

    return response.choices[0].message.content
