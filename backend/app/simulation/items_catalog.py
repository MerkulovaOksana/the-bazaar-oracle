"""
The Bazaar items catalog — adapted to the new engine API.
Item fields: damage, healing, shield_amount, crit_chance, crit_multiplier,
             multicast, applies_burn, applies_freeze, applies_poison,
             applies_haste, applies_slow, applies_charge
"""

from .engine import Item, Side, PlayerState, BattleState, BattleSimulator

ITEMS_CATALOG: dict[str, dict] = {
    # === WEAPONS ===
    "sword": {
        "name": "Меч",
        "tier": "bronze",
        "cooldown_ms": 3000,
        "multicast": 1,
        "damage": 40.0,
        "crit_chance": 0.25,
    },
    "heavy_axe": {
        "name": "Тяжёлый топор",
        "tier": "silver",
        "cooldown_ms": 5000,
        "multicast": 1,
        "damage": 70.0,
        "crit_chance": 0.15,
    },
    "twin_daggers": {
        "name": "Парные кинжалы",
        "tier": "silver",
        "cooldown_ms": 2500,
        "multicast": 2,
        "damage": 20.0,
        "crit_chance": 0.30,
    },
    "storm_glaive": {
        "name": "Штормовая глефа",
        "tier": "gold",
        "cooldown_ms": 4000,
        "multicast": 3,
        "damage": 25.0,
        "crit_chance": 0.10,
    },
    "shadow_katana": {
        "name": "Теневая катана",
        "tier": "diamond",
        "cooldown_ms": 3500,
        "multicast": 4,
        "damage": 22.0,
        "crit_chance": 0.20,
    },
    "divine_avenger": {
        "name": "Божественный мститель",
        "tier": "legendary",
        "cooldown_ms": 5000,
        "multicast": 3,
        "damage": 35.0,
        "healing": 15.0,
        "crit_chance": 0.15,
    },

    # === BURN ===
    "torch": {
        "name": "Факел",
        "tier": "bronze",
        "cooldown_ms": 4000,
        "multicast": 1,
        "damage": 20.0,
        "applies_burn": 15.0,
    },
    "flame_blade": {
        "name": "Огненный клинок",
        "tier": "silver",
        "cooldown_ms": 5000,
        "multicast": 1,
        "damage": 30.0,
        "applies_burn": 25.0,
    },
    "inferno_staff": {
        "name": "Посох инферно",
        "tier": "gold",
        "cooldown_ms": 6000,
        "multicast": 2,
        "damage": 15.0,
        "applies_burn": 20.0,
    },

    # === POISON ===
    "vial": {
        "name": "Флакон яда",
        "tier": "bronze",
        "cooldown_ms": 6000,
        "multicast": 1,
        "applies_poison": 8.0,
    },
    "poison_dagger": {
        "name": "Отравленный кинжал",
        "tier": "silver",
        "cooldown_ms": 4000,
        "multicast": 2,
        "damage": 10.0,
        "applies_poison": 6.0,
    },
    "plague_totem": {
        "name": "Чумной тотем",
        "tier": "gold",
        "cooldown_ms": 8000,
        "multicast": 1,
        "applies_poison": 20.0,
        "applies_slow": 1500,
    },

    # === FREEZE ===
    "ice_staff": {
        "name": "Ледяной жезл",
        "tier": "silver",
        "cooldown_ms": 7000,
        "multicast": 1,
        "damage": 15.0,
        "applies_freeze": 2000,
    },
    "frost_ward": {
        "name": "Морозный оберег",
        "tier": "silver",
        "cooldown_ms": 9000,
        "multicast": 1,
        "shield_amount": 35.0,
        "applies_freeze": 2500,
    },
    "blizzard_orb": {
        "name": "Сфера бурана",
        "tier": "gold",
        "cooldown_ms": 10000,
        "multicast": 2,
        "applies_freeze": 1500,
        "damage": 10.0,
    },

    # === SHIELDS / DEFENSE ===
    "buckler": {
        "name": "Баклер",
        "tier": "bronze",
        "cooldown_ms": 5000,
        "multicast": 1,
        "shield_amount": 30.0,
    },
    "aegis_barrier": {
        "name": "Эгида",
        "tier": "gold",
        "cooldown_ms": 7000,
        "multicast": 1,
        "shield_amount": 80.0,
    },
    "titan_shield": {
        "name": "Щит титана",
        "tier": "diamond",
        "cooldown_ms": 8000,
        "multicast": 1,
        "shield_amount": 120.0,
    },

    # === HEALING ===
    "health_potion": {
        "name": "Зелье лечения",
        "tier": "bronze",
        "cooldown_ms": 6000,
        "multicast": 1,
        "healing": 40.0,
    },
    "regeneration_orb": {
        "name": "Сфера регенерации",
        "tier": "silver",
        "cooldown_ms": 4000,
        "multicast": 1,
        "healing": 25.0,
    },
    "holy_grail": {
        "name": "Святой Грааль",
        "tier": "legendary",
        "cooldown_ms": 5000,
        "multicast": 2,
        "healing": 30.0,
        "shield_amount": 20.0,
    },

    # === HASTE / SLOW / UTILITY ===
    "haste_boots": {
        "name": "Сапоги скорости",
        "tier": "bronze",
        "cooldown_ms": 6000,
        "multicast": 1,
        "applies_haste": 2000,
    },
    "chrono_crystal": {
        "name": "Кристалл времени",
        "tier": "silver",
        "cooldown_ms": 7000,
        "multicast": 1,
        "applies_haste": 3000,
        "applies_slow": 2000,
    },
    "hex_totem": {
        "name": "Тотем проклятия",
        "tier": "gold",
        "cooldown_ms": 8000,
        "multicast": 1,
        "damage": 15.0,
        "applies_slow": 3000,
        "applies_poison": 5.0,
    },

    # === COMBO ===
    "vampiric_fang": {
        "name": "Вампирский клык",
        "tier": "gold",
        "cooldown_ms": 5000,
        "multicast": 2,
        "damage": 25.0,
        "healing": 15.0,
    },
    "apocalypse_blade": {
        "name": "Клинок Апокалипсиса",
        "tier": "legendary",
        "cooldown_ms": 4000,
        "multicast": 5,
        "damage": 18.0,
        "applies_burn": 5.0,
        "crit_chance": 0.10,
    },
}


MONSTERS: dict[str, dict] = {
    "goblin_scout": {
        "name": "Гоблин-разведчик",
        "hp": 150,
        "items": ["sword", "buckler"],
    },
    "forest_troll": {
        "name": "Лесной тролль",
        "hp": 350,
        "items": ["heavy_axe", "health_potion", "buckler"],
    },
    "frost_elemental": {
        "name": "Ледяной элементаль",
        "hp": 300,
        "items": ["ice_staff", "frost_ward", "regeneration_orb"],
    },
    "shadow_assassin": {
        "name": "Теневой убийца",
        "hp": 250,
        "items": ["shadow_katana", "poison_dagger", "twin_daggers"],
    },
    "dragon_whelp": {
        "name": "Дракончик",
        "hp": 450,
        "items": ["flame_blade", "aegis_barrier", "storm_glaive"],
    },
    "undead_knight": {
        "name": "Рыцарь нежити",
        "hp": 500,
        "items": ["heavy_axe", "vampiric_fang", "aegis_barrier", "hex_totem"],
    },
    "demon_lord": {
        "name": "Демон-лорд",
        "hp": 700,
        "items": ["apocalypse_blade", "divine_avenger", "frost_ward", "titan_shield"],
    },
}


def build_item(item_id: str, idx: int = 0) -> Item:
    """Create an Item instance from catalog entry."""
    data = ITEMS_CATALOG[item_id]
    return Item(
        id=f"{item_id}_{idx}",
        name=data["name"],
        board_pos=idx,
        cooldown_ms=data["cooldown_ms"],
        damage=data.get("damage", 0.0),
        healing=data.get("healing", 0.0),
        shield_amount=data.get("shield_amount", 0.0),
        crit_chance=data.get("crit_chance", 0.0),
        crit_multiplier=data.get("crit_multiplier", 2.0),
        multicast=data.get("multicast", 1),
        applies_burn=data.get("applies_burn", 0.0),
        applies_freeze=data.get("applies_freeze", 0),
        applies_poison=data.get("applies_poison", 0.0),
        applies_haste=data.get("applies_haste", 0),
        applies_slow=data.get("applies_slow", 0),
        applies_charge=data.get("applies_charge", 0),
    )


def get_catalog_items() -> list[dict]:
    """Return catalog as list of dicts for API."""
    result = []
    for item_id, data in ITEMS_CATALOG.items():
        entry = {"id": item_id, "tier": data.get("tier", "bronze")}
        entry.update(data)
        result.append(entry)
    return result
