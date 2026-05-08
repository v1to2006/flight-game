VALID_UPGRADE_STATS = {
    "hp": "hp_level",
    "speed": "speed_level",
    "damage": "damage_level",
    "firerate": "firerate_level",
}

MAX_UPGRADE_LEVEL = 5

UPGRADE_PRICES = {
    1: 100,
    2: 125,
    3: 150,
    4: 175,
    5: 200,
}


def get_upgrade_multiplier(level):
    return round(1 + int(level) * 0.10, 2)


def get_upgrade_price(new_level):
    return UPGRADE_PRICES.get(int(new_level), 0)


def get_next_upgrade_price(current_level):
    current_level = int(current_level)

    if current_level >= MAX_UPGRADE_LEVEL:
        return None

    return get_upgrade_price(current_level + 1)


def calculate_plane_stats(row):
    return {
        "hp": round(row["default_hp"] * get_upgrade_multiplier(row["hp_level"])),
        "speed": round(row["default_speed"] * get_upgrade_multiplier(row["speed_level"])),
        "damage": round(row["default_damage"] * get_upgrade_multiplier(row["damage_level"])),
        "firerate": round(float(row["default_firerate"]) * get_upgrade_multiplier(row["firerate_level"]), 2),
    }