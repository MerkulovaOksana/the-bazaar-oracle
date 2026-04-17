#!/usr/bin/env python3
"""
Add catalog entries that exist on Bazaar DB but are missing from wiki_catalog.json
(wiki Cargo lags behind the game).

Discovery (no JS):
  - Monsters: all /card/… links from https://bazaardb.gg/search?c=monsters (SSR, large HTML).
  - Items + skills: union of /card/… from search?q=<char>&c=items|skills for a-z and 0-9
    (site does not SSR the full item list on a single page).

For each discovered path not already in our catalog, fetch the card page and read
og:title, og:image, og:description. Simulator stats for new items are placeholders
(category skill vs item inferred from which search bucket contained the path).

Usage (repo root):
  python scripts/import_bazaar_gaps.py
  python scripts/import_bazaar_gaps.py --limit 50
  python scripts/import_bazaar_gaps.py --dry-run
"""

from __future__ import annotations

import argparse
import html as html_module
import json
import re
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

UA = "BattleOracleBazaarGapImport/1.0 (https://github.com/MerkulovaOksana/the-bazaar-oracle; BazaarDB-permitted)"
BASE = "https://bazaardb.gg"

ROOT = Path(__file__).resolve().parent.parent
WIKI_CATALOG = ROOT / "backend" / "app" / "data" / "wiki_catalog.json"

CARD_HREF_RE = re.compile(r'href="(/card/[^"]+)"')
OG_IMAGE_RE = re.compile(r'<meta\s+property="og:image"\s+content="([^"]+)"', re.I)
OG_DESC_RE = re.compile(r'<meta\s+property="og:description"\s+content="([^"]*)"', re.I)
OG_TITLE_RE = re.compile(r'<meta\s+property="og:title"\s+content="([^"]*)"', re.I)


def http_get(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read().decode("utf-8", "replace")


def page_to_id(title: str) -> str:
    s = title.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    return s.strip("_") or "item"


def card_paths_from_search_url(url: str) -> list[str]:
    html = http_get(url)
    out: list[str] = []
    seen: set[str] = set()
    for m in CARD_HREF_RE.finditer(html):
        p = html_module.unescape(m.group(1))
        if p not in seen:
            seen.add(p)
            out.append(p)
    return out


def discover_monster_paths() -> list[str]:
    # /search?c=monsters returns a mixed SSR bundle (monsters + items + skills)
    # because bazaardb filters client-side. We rely on the caller to subtract
    # item/skill paginated sets for accurate monster detection.
    return card_paths_from_search_url(f"{BASE}/search?c=monsters")


def _paginate_category(category: str, *, max_pages: int = 400) -> set[str]:
    """Walk /search?c=<category>&page=N until a page yields no new cards."""
    seen: set[str] = set()
    for page in range(1, max_pages + 1):
        url = f"{BASE}/search?c={category}&page={page}"
        try:
            batch = set(card_paths_from_search_url(url))
        except Exception:
            break
        new = batch - seen
        if not new:
            break
        seen |= batch
        time.sleep(0.15)
    return seen


def discover_item_and_skill_paths() -> tuple[set[str], set[str]]:
    """Full bazaardb coverage via per-category pagination."""
    items = _paginate_category("items")
    skills = _paginate_category("skills")
    return items, skills


def clean_card_title(title: str) -> str:
    t = title.strip()
    for sep in (" - Item - The Bazaar", " - Monster - The Bazaar", " - Skill - The Bazaar"):
        if sep in t:
            return t.split(sep)[0].strip()
    return t


def parse_card(path: str) -> tuple[str | None, str | None, str | None, str | None]:
    """Returns (title, image, description, error)."""
    url = BASE + path
    try:
        page = http_get(url)
    except Exception as e:
        return None, None, None, str(e)
    tm = OG_TITLE_RE.search(page)
    im = OG_IMAGE_RE.search(page)
    dm = OG_DESC_RE.search(page)
    title = clean_card_title(html_module.unescape(tm.group(1).strip())) if tm else None
    image = html_module.unescape(im.group(1).strip()) if im else None
    desc = html_module.unescape(dm.group(1).strip()) if dm else None
    return title, image, desc, None


def slug_to_name(slug: str) -> str:
    slug = html_module.unescape(slug)
    return slug.replace("-", " ").replace("_", " ").strip()


def stub_item(name: str, category: str, image_url: str | None, bazaar_desc: str, card_path: str) -> dict:
    short = bazaar_desc[:220] + ("…" if len(bazaar_desc) > 220 else "")
    d: dict = {
        "name": name,
        "desc": short or name,
        "bazaar_desc": bazaar_desc,
        "category": category,
        "tier": "bronze",
        "size": "small",
        "cooldown_ms": 6000,
        "multicast": 1,
        "damage": 12.0,
        "healing": 0.0,
        "shield_amount": 0.0,
        "crit_chance": 0.0,
        "applies_burn": 0.0,
        "applies_freeze": 0,
        "applies_poison": 0.0,
        "applies_haste": 0,
        "applies_slow": 0,
        "applies_charge": 0,
        "crit_multiplier": 2.0,
        "source": "bazaar_only",
        "bazaar_card_path": card_path,
    }
    if image_url:
        d["image_url"] = image_url
    return d


def stub_monster(name: str, image: str | None, bazaar_desc: str, card_path: str) -> dict:
    return {
        "name": name,
        "hp": 400,
        "day": 1,
        "tier": "bronze",
        "image": image or "",
        "items": [],
        "bazaar_desc": bazaar_desc,
        "source": "bazaar_only",
        "bazaar_card_path": card_path,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="Max new entities to add (0 = unlimited)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not WIKI_CATALOG.is_file():
        raise SystemExit(f"Missing {WIKI_CATALOG}; run build_wiki_catalog.py first")

    raw = json.loads(WIKI_CATALOG.read_text(encoding="utf-8"))
    items: dict[str, dict] = dict(raw["items"])
    monsters: dict[str, dict] = dict(raw["monsters"])
    meta = dict(raw.get("meta") or {})

    added_items: list[str] = []
    added_monsters: list[str] = []
    new_count = 0

    print("Discovering Bazaar card URLs…")
    m_paths = sorted(set(discover_monster_paths()))
    print(f"  monsters bucket (raw): {len(m_paths)} unique paths")
    it_paths, sk_paths = discover_item_and_skill_paths()
    print(f"  items bucket: {len(it_paths)}, skills bucket: {len(sk_paths)}")

    # bazaardb /search?c=monsters page SSR includes all cards (filtering happens
    # client-side). Treat a path as a real monster only if it did NOT surface
    # via item/skill a-z scan.
    skill_set = set(sk_paths)
    non_monster_paths = it_paths | skill_set
    filtered_m_paths = [p for p in m_paths if p not in non_monster_paths]
    print(f"  monsters bucket (filtered): {len(filtered_m_paths)} unique paths")
    m_paths = filtered_m_paths

    def allow_more() -> bool:
        return args.limit <= 0 or new_count < args.limit

    # --- Monsters first ---
    for path in m_paths:
        if not allow_more():
            break
        slug = path.rstrip("/").rsplit("/", 1)[-1]
        title, image, desc, err = parse_card(path)
        if err:
            print(f"  skip card {path}: {err}")
            time.sleep(0.25)
            continue
        name = title or slug_to_name(slug)
        mid = page_to_id(name)
        if mid in monsters:
            time.sleep(0.15)
            continue
        if not desc:
            desc = name
        print(f"  + monster {mid} ({name})")
        if not args.dry_run:
            monsters[mid] = stub_monster(name, image, desc, path)
        added_monsters.append(mid)
        new_count += 1
        time.sleep(0.3)

    # --- Items & skills (skip paths already seen as monsters id? still check items dict) ---
    ordered_item_paths: list[str] = []
    seen_ip: set[str] = set()
    for path in sorted(skill_set):
        if path not in seen_ip:
            seen_ip.add(path)
            ordered_item_paths.append(path)
    for path in sorted(it_paths):
        if path not in seen_ip:
            seen_ip.add(path)
            ordered_item_paths.append(path)

    for path in ordered_item_paths:
        if not allow_more():
            break
        slug = path.rstrip("/").rsplit("/", 1)[-1]
        title, image, desc, err = parse_card(path)
        if err:
            print(f"  skip card {path}: {err}")
            time.sleep(0.25)
            continue
        name = title or slug_to_name(slug)
        cat = "skill" if path in skill_set else "property"
        iid = page_to_id(name)
        if iid in items or iid in monsters:
            time.sleep(0.15)
            continue
        if not desc:
            desc = name
        print(f"  + item {iid} ({name}) [{cat}]")
        if not args.dry_run:
            items[iid] = stub_item(name, cat, image, desc, path)
        added_items.append(iid)
        new_count += 1
        time.sleep(0.3)

    meta["bazaar_gap_import_at"] = datetime.now(timezone.utc).isoformat()
    meta["bazaar_gap_last_run_new_items"] = len(added_items)
    meta["bazaar_gap_last_run_new_monsters"] = len(added_monsters)

    print(
        f"Done. New items: {len(added_items)}, new monsters: {len(added_monsters)}"
        + (" (dry-run)" if args.dry_run else "")
    )

    if args.dry_run:
        return

    payload = {
        "meta": meta,
        "items": items,
        "monsters": monsters,
    }
    WIKI_CATALOG.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {WIKI_CATALOG}")


if __name__ == "__main__":
    main()
