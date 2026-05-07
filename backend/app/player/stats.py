VALID_UPGRADE_STATS = {
    "hp": "hp_level",
    "speed": "speed_level",
    "damage": "damage_level",
    "firerate": "firerate_level",
}

UPGRADE_PRICES = {
    1: 100,
    2: 200,
    3: 350,
    4: 500,
    5: 750,
}


def get_upgrade_multiplier(level):
    return round(1 + int(level) * 0.10, 2)


def get_upgrade_price(new_level):
    return UPGRADE_PRICES.get(int(new_level), 0)


def calculate_plane_stats(row):
    return {
        "hp": round(row["default_hp"] * get_upgrade_multiplier(row["hp_level"])),
        "speed": round(row["default_speed"] * get_upgrade_multiplier(row["speed_level"])),
        "damage": round(row["default_damage"] * get_upgrade_multiplier(row["damage_level"])),
        "firerate": round(float(row["default_firerate"]) * get_upgrade_multiplier(row["firerate_level"]), 2),
    }