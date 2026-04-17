#!/usr/bin/env python3
"""
Fetch items + monsters from thebazaar.wiki.gg (MediaWiki + Cargo API).
Outputs backend/app/data/wiki_catalog.json for the battle simulator.

Run from repo root: python scripts/build_wiki_catalog.py
Requires network. User-Agent identifies the bot per Wikimedia policy.
"""

from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

UA = "BattleOracleCatalogBot/1.0 (https://github.com/MerkulovaOksana/the-bazaar-oracle; data import)"

BASE = "https://thebazaar.wiki.gg/api.php"
OUT = Path(__file__).resolve().parent.parent / "backend" / "app" / "data" / "wiki_catalog.json"

TIER_ORDER = ["bronze", "silver", "gold", "diamond", "legendary"]


def api_get(params: dict) -> dict:
    q = urllib.parse.urlencode(params)
    req = urllib.request.Request(f"{BASE}?{q}", headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def normalize_tier(raw: str) -> str:
    if not raw:
        return "bronze"
    t = raw.lower()
    for name in TIER_ORDER:
        if name in t:
            return name
    return "bronze"


def tier_to_index(tier: str) -> int:
    try:
        return TIER_ORDER.index(tier)
    except ValueError:
        return 0


def page_to_id(title: str) -> str:
    s = title.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    return s.strip("_") or "item"


def parse_deal_damage_numbers(effects: str) -> list[int]:
    if "deal" not in effects.lower():
        return []
    idx = effects.lower().index("deal")
    chunk = effects[idx : idx + 1200]
    return [int(x) for x in re.findall(r"'''(\d+)'''", chunk)]


def parse_numbers_after_keyword(effects: str, keyword: str, window: int = 600) -> list[int]:
    low = effects.lower()
    if keyword not in low:
        return []
    idx = low.index(keyword)
    chunk = effects[idx : idx + window]
    return [int(x) for x in re.findall(r"'''(\d+)'''", chunk)]


def parse_seconds_ms(effects: str, keyword: str) -> int:
    low = effects.lower()
    if keyword not in low:
        return 0
    idx = low.index(keyword)
    chunk = effects[idx : idx + 400]
    m = re.search(r"(\d+(?:\.\d+)?)\s*second", chunk, re.I)
    if m:
        return int(float(m.group(1)) * 1000)
    nums = re.findall(r"'''(\d+)'''", chunk)
    if nums and keyword.lower() in ("slow", "haste", "freeze"):
        return int(nums[0]) * 1000
    return 0


def parse_multicast(effects: str) -> int:
    m = re.search(r"\+?\s*(\d+)\s*Multicast", effects, re.I)
    if m:
        return max(1, int(m.group(1)))
    m = re.search(r"Multicast[^.]{0,80}'''(\d+)'''", effects, re.I)
    if m:
        return max(1, int(m.group(1)))
    return 1


def parse_crit_chance(effects: str) -> float:
    m = re.search(r"(\d+)\s*%?\s*Crit", effects, re.I)
    if m:
        return min(1.0, int(m.group(1)) / 100.0)
    m = re.search(r"Crit[^.]{0,60}'''(\d+)'''\s*%", effects, re.I)
    if m:
        return min(1.0, int(m.group(1)) / 100.0)
    return 0.0


def wiki_type_to_category(type_str: str) -> str:
    t = (type_str or "").lower()
    if "potion" in t:
        return "potion"
    if "apparel" in t:
        return "apparel"
    if "property" in t:
        return "property"
    if "tool" in t or "tech" in t:
        return "tool"
    if "weapon" in t or "damage" in t:
        return "weapon"
    return "property"


def wiki_effects_to_plain_text(effects: str, max_len: int = 300) -> str:
    """Strip wikitext/HTML from Cargo `effects` for UI descriptions."""
    if not effects:
        return ""
    s = effects
    # Links end with `]]`; do not use [^\]]* — pipe segments can contain `]` before final `]]`.
    s = re.sub(r"\[\[File:\s*[\s\S]*?\]\]", " ", s, flags=re.IGNORECASE)
    s = re.sub(r"\[\[(?:[^\]|]*\|)*([^\]|]+)\]\]", r"\1", s)
    s = re.sub(r"\[\[[^\]]+\]\]", " ", s)
    s = re.sub(r"\{\{[^}]+\}\}", " ", s)
    s = re.sub(r"'''([^']*)'''", r"\1", s)
    s = re.sub(r"''([^']*)''", r"\1", s)
    s = re.sub(r'"{2,}(\d+)"{2,}', r"\1", s)
    s = re.sub(r"'{2,}(\d+)'{2,}", r"\1", s)
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"&(?:nbsp|#x?[0-9a-f]+|[a-z]+);", " ", s, flags=re.I)
    s = re.sub(r"\s+", " ", s).strip()
    if len(s) > max_len:
        chunk = s[:max_len]
        cut = chunk.rfind(" ")
        if cut > int(max_len * 0.55):
            chunk = chunk[:cut]
        s = chunk.rstrip(" ,;:") + "…"
    # Truncation can split `[[File:...]]` mid-link — strip dangling markup tails
    s = re.sub(r"\s*\{\{[^}]*$", "", s)
    s = re.sub(r"\s*\[\[[^\]]*$", "", s)
    return s.rstrip(" ,;:").strip()


def wiki_size_to_size(size_str: str) -> str:
    s = (size_str or "").lower()
    if "medium" in s:
        return "medium"
    if "large" in s:
        return "large"
    return "small"


def parse_cooldown_ms(cooldown_raw: str) -> int:
    if not cooldown_raw or not str(cooldown_raw).strip():
        return 0
    first = str(cooldown_raw).split("/")[0].strip()
    try:
        return int(float(first) * 1000)
    except ValueError:
        return 0


def item_row_to_sim(row: dict, *, force_category: str | None = None) -> dict:
    name = row.get("_pageName") or row.get("title", {}).get("_pageName")
    effects = row.get("effects") or ""
    tier = normalize_tier(row.get("starting tier") or row.get("starting_tier") or "")
    tier_idx = tier_to_index(tier)
    cd_ms = parse_cooldown_ms(row.get("cooldown") or "")

    damages = parse_deal_damage_numbers(effects)
    damage = float(pick_scaled(damages, tier_idx)) if damages else 0.0

    heals = parse_numbers_after_keyword(effects, "heal")
    healing = float(pick_scaled(heals, tier_idx)) if heals else 0.0

    shields = parse_numbers_after_keyword(effects, "shield")
    shield_amount = float(pick_scaled(shields, tier_idx)) if shields else 0.0

    poison_nums = parse_numbers_after_keyword(effects, "poison")
    applies_poison = float(pick_scaled(poison_nums, tier_idx)) if poison_nums else 0.0

    burn_nums = parse_numbers_after_keyword(effects, "burn")
    applies_burn = float(pick_scaled(burn_nums, tier_idx)) if burn_nums else 0.0

    applies_freeze = parse_seconds_ms(effects, "freeze")
    applies_haste = parse_seconds_ms(effects, "haste")
    applies_slow = parse_seconds_ms(effects, "slow")

    multicast = parse_multicast(effects)
    crit = parse_crit_chance(effects)

    type_str = row.get("type") or ""

    # Passive-only or non-combat: no cooldown and no direct combat numbers → skip in sim (cd 0)
    if cd_ms <= 0 and damage <= 0 and healing <= 0 and shield_amount <= 0:
        if "weapon" in type_str.lower() or "damage" in type_str.lower():
            cd_ms = 6000
            damage = float(10 + tier_idx * 8)
        else:
            cd_ms = 0

    # Weapons with cooldown but failed damage parse
    if cd_ms > 0 and damage <= 0 and ("weapon" in type_str.lower() or "damage" in type_str.lower()):
        damage = float(15 + tier_idx * 12)

    # Skills table has no cooldown column; if we parsed combat numbers, assume a default cadence
    if force_category == "skill" and cd_ms <= 0 and (damage > 0 or healing > 0 or shield_amount > 0):
        cd_ms = 6000

    desc_plain = wiki_effects_to_plain_text(effects)
    if not desc_plain:
        desc_plain = f"{name} ({tier})"

    cat = force_category if force_category else wiki_type_to_category(type_str)

    return {
        "name": name,
        "desc": desc_plain or f"{name} ({tier})",
        "category": cat,
        "tier": tier,
        "size": wiki_size_to_size(row.get("size") or ("Small" if force_category == "skill" else "")),
        "cooldown_ms": cd_ms,
        "multicast": multicast,
        "damage": damage,
        "healing": healing,
        "shield_amount": shield_amount,
        "crit_chance": crit,
        "applies_burn": applies_burn,
        "applies_freeze": applies_freeze,
        "applies_poison": applies_poison,
        "applies_haste": applies_haste,
        "applies_slow": applies_slow,
        "applies_charge": 0,
        "crit_multiplier": 2.0,
    }


def pick_scaled(nums: list[int], tier_idx: int) -> int:
    if not nums:
        return 0
    idx = min(tier_idx, len(nums) - 1)
    return nums[idx]


def fetch_all_cargo_items() -> list[dict]:
    rows: list[dict] = []
    offset = 0
    fields = "_pageName,effects,cooldown,size,starting_tier=starting tier,type,collection"
    while True:
        params = {
            "action": "cargoquery",
            "tables": "items",
            "fields": fields,
            "limit": "500",
            "format": "json",
        }
        if offset:
            params["offset"] = str(offset)
        data = api_get(params)
        batch = data.get("cargoquery", [])
        rows.extend(batch)
        if len(batch) < 500:
            break
        offset += 500
        time.sleep(0.15)
    return rows


def fetch_all_cargo_skills() -> list[dict]:
    rows: list[dict] = []
    offset = 0
    fields = "_pageName,effects,type,starting_tier=starting tier"
    while True:
        params = {
            "action": "cargoquery",
            "tables": "skills",
            "fields": fields,
            "limit": "500",
            "format": "json",
        }
        if offset:
            params["offset"] = str(offset)
        data = api_get(params)
        batch = data.get("cargoquery", [])
        rows.extend(batch)
        if len(batch) < 500:
            break
        offset += 500
        time.sleep(0.15)
    return rows


def fetch_category_monsters() -> list[str]:
    titles: list[str] = []
    continue_token = None
    while True:
        params = {
            "action": "query",
            "list": "categorymembers",
            "cmtitle": "Category:Monsters",
            "cmlimit": "500",
            "format": "json",
        }
        if continue_token:
            params["cmcontinue"] = continue_token
        data = api_get(params)
        for m in data["query"]["categorymembers"]:
            if m["ns"] == 0:
                titles.append(m["title"])
        continue_token = data.get("continue", {}).get("cmcontinue")
        if not continue_token:
            break
        time.sleep(0.15)
    return titles


def fetch_wikitext(title: str) -> str | None:
    params = {
        "action": "query",
        "prop": "revisions",
        "rvprop": "content",
        "rvslots": "main",
        "titles": title,
        "format": "json",
    }
    data = api_get(params)
    pages = data.get("query", {}).get("pages", {})
    for _pid, page in pages.items():
        revs = page.get("revisions")
        if not revs:
            return None
        return revs[0]["slots"]["main"]["*"]
    return None


def parse_monster_wikitext(title: str, wikitext: str) -> dict | None:
    if "{{Monster" not in wikitext:
        return None
    hm = re.search(r"\|\s*health\s*=\s*(\d+)", wikitext)
    hp = int(hm.group(1)) if hm else 300

    lm = re.search(r"\|\s*level\s*=\s*(\d+)", wikitext)
    day = int(lm.group(1)) if lm else 1

    tm = re.search(r"\|\s*tier\s*=\s*\{\{([^}/|]+)", wikitext)
    tier_raw = tm.group(1).strip() if tm else "Bronze"
    tier = normalize_tier(tier_raw.replace("-Rarity", "").replace("_", " "))

    im = re.search(r"\|\s*image\s*=\s*([^\n]+)", wikitext)
    image_file = im.group(1).strip() if im else ""
    image_url = None
    if image_file:
        fn = image_file.replace("File:", "").strip()
        image_url = f"https://thebazaar.wiki.gg/images/{urllib.parse.quote(fn.replace(' ', '_'))}"

    item_names: list[str] = []
    for m in re.finditer(r"items\._pageName\s*=\s*'([^']+)'", wikitext):
        item_names.append(m.group(1))
    for m in re.finditer(r"items\._pageName\s*IN\s*\(([^)]+)\)", wikitext):
        inner = m.group(1)
        for part in re.split(r",", inner):
            part = part.strip().strip("'\"")
            if part:
                item_names.append(part)

    item_ids = []
    for n in item_names:
        iid = page_to_id(n)
        item_ids.append(iid)

    return {
        "name": title,
        "hp": hp,
        "day": day,
        "tier": tier,
        "image": image_url,
        "items": item_ids,
    }


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)

    print("Fetching items from Cargo...")
    raw_items = fetch_all_cargo_items()
    items_out: dict[str, dict] = {}
    for row in raw_items:
        title = row.get("title", row).get("_pageName") if isinstance(row.get("title"), dict) else row.get("_pageName")
        if not title:
            continue
        iid = page_to_id(title)
        if iid in items_out:
            iid = f"{iid}_{len(items_out)}"
        sim = item_row_to_sim(row if "_pageName" in row else row.get("title", {}))
        items_out[iid] = sim

    items_only_count = len(items_out)
    print(f"Cargo items: {items_only_count}")

    print("Fetching skills from Cargo...")
    raw_skills = fetch_all_cargo_skills()
    skills_merged = 0
    for row in raw_skills:
        inner = row.get("title", row) if isinstance(row.get("title"), dict) else row
        title = inner.get("_pageName")
        if not title:
            continue
        base_id = page_to_id(title)
        iid = base_id
        if iid in items_out:
            iid = f"{base_id}__skill"
        if iid in items_out:
            iid = f"{base_id}__skill_{skills_merged}"
        sim = item_row_to_sim(inner, force_category="skill")
        items_out[iid] = sim
        skills_merged += 1

    print(f"Skills merged: {skills_merged}; total catalog entries: {len(items_out)}")

    print("Fetching monsters...")
    monster_titles = fetch_category_monsters()
    monsters_out: dict[str, dict] = {}
    for t in monster_titles:
        time.sleep(0.12)
        wt = fetch_wikitext(t)
        if not wt:
            print(f"  skip (no wikitext): {t}")
            continue
        parsed = parse_monster_wikitext(t, wt)
        if not parsed:
            print(f"  skip (not Monster template): {t}")
            continue
        mid = page_to_id(t)
        monsters_out[mid] = parsed

    print(f"Monsters: {len(monsters_out)}")

    def carry_forward_bazaar_only() -> tuple[int, int]:
        """Keep rows imported from Bazaar DB when wiki Cargo does not list them yet."""
        if not OUT.is_file():
            return 0, 0
        try:
            prev = json.loads(OUT.read_text(encoding="utf-8"))
        except Exception:
            return 0, 0
        n_i, n_m = 0, 0
        for iid, row in (prev.get("items") or {}).items():
            if row.get("source") != "bazaar_only":
                continue
            if iid not in items_out:
                items_out[iid] = row
                n_i += 1
        for mid, row in (prev.get("monsters") or {}).items():
            if row.get("source") != "bazaar_only":
                continue
            if mid not in monsters_out:
                monsters_out[mid] = row
                n_m += 1
        return n_i, n_m

    bi, bm = carry_forward_bazaar_only()
    if bi or bm:
        print(f"Carried forward bazaar_only (not on wiki yet): +{bi} items, +{bm} monsters")

    payload = {
        "meta": {
            "source": "thebazaar.wiki.gg Cargo (items+skills) + Category:Monsters",
            "items_count": items_only_count,
            "skills_count": skills_merged,
            "catalog_item_ids": len(items_out),
            "monsters_count": len(monsters_out),
            "external_reference": (
                "bazaardb.gg (e.g. patch 13.3) may list more rows than this wiki export; "
                "this file is limited to public wiki Cargo + monster pages."
            ),
        },
        "items": items_out,
        "monsters": monsters_out,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
