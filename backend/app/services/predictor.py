"""
Prediction service: orchestrates vision parsing + simulation.
Uses the new BattleSimulator with proper Haste/Slow, Burn, Poison, Freeze mechanics.
"""

from ..simulation.engine import (
    BattleSimulator, BattleState, PlayerState, Side, Item,
)
from ..simulation.items_catalog import (
    build_item, ITEMS_CATALOG, MONSTERS, get_catalog_items,
)
from .vision import parse_screenshot, match_items_to_catalog


async def predict_from_screenshot(image_bytes: bytes, mime_type: str = "image/png") -> dict:
    parsed = await parse_screenshot(image_bytes, mime_type)

    player_item_ids = match_items_to_catalog(
        parsed.get("player", {}).get("items", []),
        ITEMS_CATALOG,
    )
    monster_item_ids = match_items_to_catalog(
        parsed.get("monster", {}).get("items", []),
        ITEMS_CATALOG,
    )

    player_hp = parsed.get("player", {}).get("hp") or 500
    monster_hp = parsed.get("monster", {}).get("hp") or 400

    result = run_simulation(
        player_item_ids=player_item_ids,
        player_hp=float(player_hp),
        monster_item_ids=monster_item_ids,
        monster_hp=float(monster_hp),
        monster_name=parsed.get("monster", {}).get("name") or "Unknown Monster",
    )

    return {
        "parsed_screenshot": parsed,
        "simulation": result,
    }


def run_simulation(
    player_item_ids: list[str],
    player_hp: float,
    monster_item_ids: list[str],
    monster_hp: float,
    monster_name: str = "Monster",
) -> dict:
    player_items = []
    for i, item_id in enumerate(player_item_ids):
        if item_id in ITEMS_CATALOG:
            player_items.append(build_item(item_id, i))

    monster_items = []
    for i, item_id in enumerate(monster_item_ids):
        if item_id in ITEMS_CATALOG:
            monster_items.append(build_item(item_id, i))

    player = PlayerState(
        side=Side.PLAYER,
        name="Player",
        max_hp=player_hp,
        items=player_items,
    )
    monster = PlayerState(
        side=Side.ENEMY,
        name=monster_name,
        max_hp=monster_hp,
        items=monster_items,
    )

    state = BattleState(player=player, enemy=monster)
    sim = BattleSimulator(state)
    winner = sim.run()

    return format_result(state, winner, player_item_ids, monster_item_ids, monster_name)


def run_simulation_from_preset(
    player_item_ids: list[str],
    player_hp: float,
    monster_id: str,
) -> dict:
    if monster_id not in MONSTERS:
        return {"error": f"Unknown monster: {monster_id}"}

    preset = MONSTERS[monster_id]
    return run_simulation(
        player_item_ids=player_item_ids,
        player_hp=player_hp,
        monster_item_ids=preset["items"],
        monster_hp=float(preset["hp"]),
        monster_name=preset["name"],
    )


def format_result(
    state: BattleState,
    winner: Side | None,
    player_item_ids: list[str],
    monster_item_ids: list[str],
    monster_name: str,
) -> dict:
    player_wins = winner == Side.PLAYER if winner is not None else False

    key_moments = []
    for line in state.log:
        if line.strip().startswith("["):
            # Parse "[  3000ms] CAST Меч (PLAYER) #1"
            key_moments.append(line.strip())

    # Keep last 60 log lines for the battle log
    battle_log = state.log[-60:] if len(state.log) > 60 else state.log

    return {
        "winner": "player" if player_wins else ("monster" if winner == Side.ENEMY else "draw"),
        "player_wins": player_wins,
        "player_hp_remaining": round(state.player.hp, 1),
        "player_hp_max": state.player.max_hp,
        "player_shield": round(state.player.shield, 1),
        "monster_hp_remaining": round(state.enemy.hp, 1),
        "monster_hp_max": state.enemy.max_hp,
        "monster_shield": round(state.enemy.shield, 1),
        "monster_name": monster_name,
        "battle_time_ms": state.now,
        "total_casts": sum(1 for l in state.log if "CAST " in l),
        "player_items": player_item_ids,
        "monster_items": monster_item_ids,
        "player_burn": round(state.player.burn.pool, 1),
        "player_poison": round(state.player.poison.stacks, 1),
        "monster_burn": round(state.enemy.burn.pool, 1),
        "monster_poison": round(state.enemy.poison.stacks, 1),
        "battle_log": battle_log,
        "key_moments": [],  # kept for frontend compat
    }
