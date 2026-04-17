#!/usr/bin/env python3
"""
Daily catalog maintenance (run from repo root, needs network).

1. Query thebazaar.wiki.gg (Cargo + Category:Monsters) for current row counts.
2. Compare with backend/app/data/wiki_catalog.json meta.
3. If any count differs (or file missing): run scripts/build_wiki_catalog.py — full regen
   (bazaar_only rows are carried forward automatically).
4. If counts match: skip rebuild.
5. Run scripts/import_bazaar_gaps.py — add cards that exist on Bazaar DB but not in the catalog
   (cap with --gap-limit).
6. Run scripts/enrich_bazaardb_catalog.py --only-missing for legacy rows still missing image_url
   (cap with --enrich-limit).

Typical cron / GitHub Actions: once per day.

Usage:
  python scripts/daily_catalog_sync.py
  python scripts/daily_catalog_sync.py --enrich-limit 150
  python scripts/daily_catalog_sync.py --skip-enrich
  python scripts/daily_catalog_sync.py --force-build
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WIKI_CATALOG = ROOT / "backend" / "app" / "data" / "wiki_catalog.json"
BUILD_SCRIPT = ROOT / "scripts" / "build_wiki_catalog.py"
GAP_SCRIPT = ROOT / "scripts" / "import_bazaar_gaps.py"
ENRICH_SCRIPT = ROOT / "scripts" / "enrich_bazaardb_catalog.py"

sys.path.insert(0, str(Path(__file__).resolve().parent))
from import_bazaar_gaps import (  # noqa: E402
    discover_item_and_skill_paths,
    discover_monster_paths,
    page_to_id,
    slug_to_name,
)

UA = "BattleOracleDailySync/1.0 (https://github.com/MerkulovaOksana/the-bazaar-oracle)"
WIKI_API = "https://thebazaar.wiki.gg/api.php"


def api_get(params: dict) -> dict:
    q = urllib.parse.urlencode(params)
    req = urllib.request.Request(f"{WIKI_API}?{q}", headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def count_cargo_table(table: str) -> int:
    n = 0
    offset = 0
    while True:
        params: dict = {
            "action": "cargoquery",
            "tables": table,
            "fields": "_pageName",
            "limit": "500",
            "format": "json",
        }
        if offset:
            params["offset"] = str(offset)
        data = api_get(params)
        batch = data.get("cargoquery", [])
        n += len(batch)
        if len(batch) < 500:
            break
        offset += 500
        time.sleep(0.15)
    return n


def count_monster_category() -> int:
    n = 0
    continue_token = None
    while True:
        params: dict = {
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
                n += 1
        continue_token = data.get("continue", {}).get("cmcontinue")
        if not continue_token:
            break
        time.sleep(0.15)
    return n


def load_local_catalog() -> tuple[dict | None, dict, dict]:
    if not WIKI_CATALOG.is_file():
        return None, {}, {}
    raw = json.loads(WIKI_CATALOG.read_text(encoding="utf-8"))
    return raw.get("meta") or {}, dict(raw.get("items") or {}), dict(raw.get("monsters") or {})


def _slug(path: str) -> str:
    return path.rstrip("/").rsplit("/", 1)[-1]


def count_new_bazaar_entities(
    m_paths: list[str],
    item_paths: set[str],
    skill_paths: set[str],
    local_items: dict,
    local_monsters: dict,
) -> tuple[int, int]:
    """Estimate how many bazaar cards are missing from local catalog."""
    new_monsters = 0
    for p in m_paths:
        mid = page_to_id(slug_to_name(_slug(p)))
        if mid not in local_monsters:
            new_monsters += 1
    new_items = 0
    for p in set().union(item_paths, skill_paths):
        iid = page_to_id(slug_to_name(_slug(p)))
        if iid not in local_items and iid not in local_monsters:
            new_items += 1
    return new_items, new_monsters


def counts_match(wiki: dict, local: dict | None) -> bool:
    if not local:
        return False
    try:
        return (
            int(local.get("items_count", -1)) == wiki["items"]
            and int(local.get("skills_count", -1)) == wiki["skills"]
            and int(local.get("monsters_count", -1)) == wiki["monsters"]
        )
    except (TypeError, ValueError):
        return False


def run_script(path: Path, extra: list[str]) -> None:
    cmd = [sys.executable, str(path), *extra]
    print("Run:", " ".join(cmd))
    subprocess.run(cmd, cwd=str(ROOT), check=True)


def main() -> None:
    ap = argparse.ArgumentParser(description="Wiki count check + optional build + Bazaar enrich")
    ap.add_argument("--force-build", action="store_true", help="Always run build_wiki_catalog.py")
    ap.add_argument("--skip-enrich", action="store_true", help="Do not run bazaardb enrich")
    ap.add_argument(
        "--skip-gap-import",
        action="store_true",
        help="Do not run import_bazaar_gaps.py",
    )
    ap.add_argument(
        "--force-gap-import",
        action="store_true",
        help="Run gap import even if bazaar/local counts match",
    )
    ap.add_argument(
        "--gap-limit",
        type=int,
        default=120,
        help="Max new Bazaar-only entities per run (0 = unlimited). Default 120.",
    )
    ap.add_argument(
        "--enrich-limit",
        type=int,
        default=200,
        help="Max Bazaar card fetches this run (0 = no limit). Default 200 for daily jobs.",
    )
    args = ap.parse_args()

    print("Step 1/4: probing thebazaar.wiki.gg counts...")
    items_n = count_cargo_table("items")
    skills_n = count_cargo_table("skills")
    monsters_n = count_monster_category()
    wiki_counts = {"items": items_n, "skills": skills_n, "monsters": monsters_n}
    print(f"  wiki  : items={items_n}, skills={skills_n}, monsters={monsters_n}")

    local_meta, _, _ = load_local_catalog()
    if local_meta:
        print(
            f"  local : items={local_meta.get('items_count')}, "
            f"skills={local_meta.get('skills_count')}, "
            f"monsters={local_meta.get('monsters_count')}"
        )

    need_build = args.force_build or not counts_match(wiki_counts, local_meta)

    print("")
    print("Step 2/4: wiki rebuild decision")
    if need_build:
        print("  -> counts differ (or --force-build); running build_wiki_catalog.py")
        run_script(BUILD_SCRIPT, [])
    else:
        print("  -> wiki counts match local; skipping rebuild")

    # Reload after potential rebuild.
    _, local_items, local_monsters = load_local_catalog()

    print("")
    print("Step 3/4: comparing against bazaardb.gg")
    if args.skip_gap_import:
        print("  -> skipped by --skip-gap-import")
    else:
        print("  probing bazaardb (monsters SSR + a-z items/skills)...")
        m_paths_raw = discover_monster_paths()
        item_paths, skill_paths = discover_item_and_skill_paths()
        # /search?c=monsters SSR includes all cards (JS-side filter), so trust
        # only paths that did not surface in the items/skills scan.
        non_monster = item_paths | skill_paths
        m_paths = [p for p in m_paths_raw if p not in non_monster]
        bazaar_item_total = len(non_monster)
        print(
            f"  bazaar: monsters_seen={len(m_paths)} "
            f"(raw {len(m_paths_raw)}), items+skills_seen={bazaar_item_total}"
        )
        new_items, new_monsters = count_new_bazaar_entities(
            m_paths, item_paths, skill_paths, local_items, local_monsters
        )
        print(f"  missing vs local: items+skills={new_items}, monsters={new_monsters}")

        if new_items == 0 and new_monsters == 0 and not args.force_gap_import:
            print("  -> nothing new on bazaar; skipping gap import")
        else:
            gap_args: list[str] = []
            if args.gap_limit > 0:
                gap_args = ["--limit", str(args.gap_limit)]
            print("  -> running import_bazaar_gaps.py")
            run_script(GAP_SCRIPT, gap_args)

    print("")
    print("Step 4/4: bazaar enrichment (images/descriptions)")
    if args.skip_enrich:
        print("  -> skipped by --skip-enrich")
        return

    enrich_args = ["--only-missing"]
    if args.enrich_limit > 0:
        enrich_args.extend(["--limit", str(args.enrich_limit)])
    run_script(ENRICH_SCRIPT, enrich_args)


if __name__ == "__main__":
    main()
