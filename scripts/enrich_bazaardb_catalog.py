#!/usr/bin/env python3
"""
Fetch Bazaar DB card pages (project permitted) and extract og:image + og:description
for entries in wiki_catalog.json.

Writes backend/app/data/bazaardb_enrichment.json — merged at runtime in items_catalog.py.

Usage (repo root):
  python scripts/enrich_bazaardb_catalog.py
  python scripts/enrich_bazaardb_catalog.py --limit 20
  python scripts/enrich_bazaardb_catalog.py --only-missing
"""

from __future__ import annotations

import argparse
import html as html_module
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

UA = "BattleOracleCatalogEnrich/1.0 (https://github.com/MerkulovaOksana/the-bazaar-oracle; BazaarDB-permitted)"
BASE = "https://bazaardb.gg"

ROOT = Path(__file__).resolve().parent.parent
WIKI_CATALOG = ROOT / "backend" / "app" / "data" / "wiki_catalog.json"
OUT = ROOT / "backend" / "app" / "data" / "bazaardb_enrichment.json"

CARD_HREF_RE = re.compile(r'href="(/card/[^"]+)"')
OG_IMAGE_RE = re.compile(r'<meta\s+property="og:image"\s+content="([^"]+)"', re.I)
OG_DESC_RE = re.compile(r'<meta\s+property="og:description"\s+content="([^"]*)"', re.I)


def http_get(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=45) as resp:
        return resp.read().decode("utf-8", "replace")


def _normalize_name_key(s: str) -> str:
    """Match wiki names to Bazaar URL slugs (strip punctuation, collapse space)."""
    s = s.lower().strip()
    for ch in ("'", "\u2019", "\u2018", "`"):
        s = s.replace(ch, "")
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def slug_matches_name(card_path: str, display_name: str) -> bool:
    slug = card_path.rstrip("/").rsplit("/", 1)[-1]
    left = _normalize_name_key(slug.replace("-", " "))
    right = _normalize_name_key(display_name)
    return left == right


def find_card_path(html: str, display_name: str) -> str | None:
    seen: list[str] = []
    for m in CARD_HREF_RE.finditer(html):
        p = html_module.unescape(m.group(1))
        if p not in seen:
            seen.append(p)
    for p in seen:
        if slug_matches_name(p, display_name):
            return p
    return None


def parse_card_page(page_html: str) -> tuple[str | None, str | None]:
    im = OG_IMAGE_RE.search(page_html)
    dm = OG_DESC_RE.search(page_html)
    image = html_module.unescape(im.group(1).strip()) if im else None
    desc = html_module.unescape(dm.group(1).strip()) if dm else None
    return image, desc


def search_category_for_item(category: str) -> str:
    return "skills" if category == "skill" else "items"


@dataclass
class EnrichResult:
    image_url: str | None = None
    bazaar_desc: str | None = None
    card_path: str | None = None
    error: str | None = None


def enrich_one(name: str, list_category: str) -> EnrichResult:
    q = urllib.parse.quote(name)
    search_url = f"{BASE}/search?q={q}&c={urllib.parse.quote(list_category)}"
    try:
        search_html = http_get(search_url)
    except urllib.error.HTTPError as e:
        return EnrichResult(error=f"search HTTP {e.code}")
    except Exception as e:
        return EnrichResult(error=str(e))

    path = find_card_path(search_html, name)
    if not path:
        return EnrichResult(error="no matching card in search results")

    card_url = BASE + path
    try:
        card_html = http_get(card_url)
    except urllib.error.HTTPError as e:
        return EnrichResult(card_path=path, error=f"card HTTP {e.code}")
    except Exception as e:
        return EnrichResult(card_path=path, error=str(e))

    image, desc = parse_card_page(card_html)
    return EnrichResult(image_url=image, bazaar_desc=desc, card_path=path)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="Max total new fetches (0 = all)")
    ap.add_argument("--only-missing", action="store_true", help="Skip entries that already have image_url")
    ap.add_argument("--sleep", type=float, default=0.35, help="Delay after each card fetch")
    args = ap.parse_args()

    raw = json.loads(WIKI_CATALOG.read_text(encoding="utf-8"))
    items: dict[str, dict] = raw["items"]
    monsters: dict[str, dict] = raw["monsters"]

    existing: dict = {"items": {}, "monsters": {}}
    if OUT.is_file():
        existing = json.loads(OUT.read_text(encoding="utf-8"))
        existing.setdefault("items", {})
        existing.setdefault("monsters", {})

    out_items: dict[str, dict] = {k: dict(v) for k, v in existing["items"].items()}
    out_monsters: dict[str, dict] = {k: dict(v) for k, v in existing["monsters"].items()}

    def skip(bucket: dict, eid: str) -> bool:
        if not args.only_missing:
            return False
        cur = bucket.get(eid)
        return bool(cur and cur.get("image_url"))

    fetched = 0
    max_fetch = args.limit if args.limit > 0 else 10**9

    print("Enriching items + skills...")
    for eid, data in items.items():
        if fetched >= max_fetch:
            break
        if skip(out_items, eid):
            continue
        name = data.get("name") or eid
        cat = search_category_for_item(data.get("category") or "")
        r = enrich_one(name, cat)
        time.sleep(args.sleep)
        entry: dict = {k: v for k, v in asdict(r).items() if v is not None}
        if eid in out_items:
            merged = {**out_items[eid], **entry}
            out_items[eid] = merged
        else:
            out_items[eid] = entry
        fetched += 1
        if r.error and not r.image_url:
            print(f"  [item] {eid}: {r.error}")
        elif fetched % 50 == 0:
            print(f"  ... {fetched} fetches")

    print("Enriching monsters...")
    for mid, data in monsters.items():
        if fetched >= max_fetch:
            break
        if skip(out_monsters, mid):
            continue
        name = data.get("name") or mid
        r = enrich_one(name, "monsters")
        time.sleep(args.sleep)
        entry = {k: v for k, v in asdict(r).items() if v is not None}
        if mid in out_monsters:
            out_monsters[mid] = {**out_monsters[mid], **entry}
        else:
            out_monsters[mid] = entry
        fetched += 1
        if r.error and not r.image_url:
            print(f"  [monster] {mid}: {r.error}")
        elif fetched % 50 == 0:
            print(f"  ... {fetched} fetches")

    payload = {
        "meta": {
            "source": "bazaardb.gg",
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "wiki_catalog_items": len(items),
            "wiki_catalog_monsters": len(monsters),
        },
        "items": out_items,
        "monsters": out_monsters,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUT} ({fetched} fetches this run)")


if __name__ == "__main__":
    main()
