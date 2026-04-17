#!/usr/bin/env python3
"""
Daily catalog maintenance (run from repo root, needs network).

1. Query thebazaar.wiki.gg (Cargo + Category:Monsters) for current row counts.
2. Compare with backend/app/data/wiki_catalog.json meta.
3. If any count differs (or file missing): run scripts/build_wiki_catalog.py — full regen.
4. If counts match: skip rebuild (wiki snapshot already matches what we shipped).
5. Run scripts/enrich_bazaardb_catalog.py --only-missing to pull Bazaar DB art/blurbs
   for entries still missing image_url (incremental; cap with --enrich-limit).

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
ENRICH_SCRIPT = ROOT / "scripts" / "enrich_bazaardb_catalog.py"

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


def load_local_meta() -> dict | None:
    if not WIKI_CATALOG.is_file():
        return None
    raw = json.loads(WIKI_CATALOG.read_text(encoding="utf-8"))
    return raw.get("meta") or {}


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
        "--enrich-limit",
        type=int,
        default=200,
        help="Max Bazaar card fetches this run (0 = no limit). Default 200 for daily jobs.",
    )
    args = ap.parse_args()

    print("Probing wiki.gg counts…")
    items_n = count_cargo_table("items")
    skills_n = count_cargo_table("skills")
    monsters_n = count_monster_category()
    wiki_counts = {"items": items_n, "skills": skills_n, "monsters": monsters_n}
    print(f"  Wiki: items={items_n}, skills={skills_n}, monsters={monsters_n}")

    local_meta = load_local_meta()
    if local_meta:
        print(
            f"  Local meta: items={local_meta.get('items_count')}, "
            f"skills={local_meta.get('skills_count')}, "
            f"monsters={local_meta.get('monsters_count')}"
        )

    need_build = args.force_build or not counts_match(wiki_counts, local_meta)

    if need_build:
        print("→ Rebuilding wiki_catalog.json (counts changed or --force-build).")
        run_script(BUILD_SCRIPT, [])
    else:
        print("→ Wiki counts match local file; skipping full rebuild.")

    if args.skip_enrich:
        print("→ Skipping Bazaar enrich (--skip-enrich).")
        return

    enrich_args = ["--only-missing"]
    if args.enrich_limit > 0:
        enrich_args.extend(["--limit", str(args.enrich_limit)])
    print("→ Bazaar DB enrichment (missing images/descriptions only).")
    run_script(ENRICH_SCRIPT, enrich_args)


if __name__ == "__main__":
    main()
