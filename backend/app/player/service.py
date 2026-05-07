from app.db.connection import get_db_connection
from app.player.stats import (
    VALID_UPGRADE_STATS,
    calculate_plane_stats,
    get_upgrade_multiplier,
    get_upgrade_price,
)

STARTER_PLANE_ID = 1
MAX_UPGRADE_LEVEL = 5


def create_player_profile(user_id):
    existing_player = get_player_by_user_id(user_id)

    if existing_player is not None:
        return existing_player

    db = get_db_connection()

    try:
        with db.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO players (user_id, money)
                VALUES (%s, %s)
                """,
                (user_id, 0),
            )

            player_id = cursor.lastrowid

            cursor.execute(
                """
                INSERT INTO player_planes (player_id, plane_id)
                VALUES (%s, %s)
                """,
                (player_id, STARTER_PLANE_ID),
            )

            player_plane_id = cursor.lastrowid

            cursor.execute(
                """
                UPDATE players
                SET current_player_plane_id = %s
                WHERE id = %s
                """,
                (player_plane_id, player_id),
            )
    finally:
        db.close()

    return get_player_by_user_id(user_id)


def get_player_by_user_id(user_id):
    db = get_db_connection()

    try:
        with db.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, user_id, current_player_plane_id, money, created_at
                FROM players
                WHERE user_id = %s
                """,
                (user_id,),
            )

            return cursor.fetchone()
    finally:
        db.close()


def get_or_create_player(user_id):
    player = get_player_by_user_id(user_id)

    if player is not None:
        return player

    return create_player_profile(user_id)


def get_player_profile(user_id):
    player = get_or_create_player(user_id)
    if player is None:
        raise RuntimeError("Failed to get player")

    return {
        "id": player["id"],
        "userId": player["user_id"],
        "money": player["money"],
        "currentPlayerPlaneId": player["current_player_plane_id"],
    }


def get_owned_planes(user_id):
    player = get_or_create_player(user_id)
    if player is None:
        raise RuntimeError("Failed to get player")

    db = get_db_connection()

    try:
        with db.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    pp.id AS player_plane_id,
                    pp.player_id,
                    pp.plane_id,
                    pp.hp_level,
                    pp.speed_level,
                    pp.damage_level,
                    pp.firerate_level,
                    pp.purchased_at,

                    p.name,
                    p.default_hp,
                    p.default_speed,
                    p.default_damage,
                    p.default_firerate,
                    p.price
                FROM player_planes pp
                JOIN planes p ON p.id = pp.plane_id
                WHERE pp.player_id = %s
                ORDER BY pp.id
                """,
                (player["id"],),
            )

            rows = cursor.fetchall()
    finally:
        db.close()

    return [format_owned_plane(row, player["current_player_plane_id"]) for row in rows]


def get_shop_planes(user_id):
    player = get_or_create_player(user_id)
    if player is None:
        raise RuntimeError("Failed to get player")

    db = get_db_connection()

    try:
        with db.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    p.id,
                    p.name,
                    p.default_hp,
                    p.default_speed,
                    p.default_damage,
                    p.default_firerate,
                    p.price,
                    pp.id AS player_plane_id
                FROM planes p
                LEFT JOIN player_planes pp
                    ON pp.plane_id = p.id
                    AND pp.player_id = %s
                ORDER BY p.price, p.id
                """,
                (player["id"],),
            )

            rows = cursor.fetchall()
    finally:
        db.close()

    return [
        {
            "planeId": row["id"],
            "name": row["name"],
            "owned": row["player_plane_id"] is not None,
            "playerPlaneId": row["player_plane_id"],
            "price": row["price"],
            "baseStats": {
                "hp": row["default_hp"],
                "speed": row["default_speed"],
                "damage": row["default_damage"],
                "firerate": float(row["default_firerate"]),
            },
        }
        for row in rows
    ]


def format_owned_plane(row, current_player_plane_id):
    return {
        "playerPlaneId": row["player_plane_id"],
        "planeId": row["plane_id"],
        "name": row["name"],
        "selected": row["player_plane_id"] == current_player_plane_id,
        "price": row["price"],
        "baseStats": {
            "hp": row["default_hp"],
            "speed": row["default_speed"],
            "damage": row["default_damage"],
            "firerate": float(row["default_firerate"]),
        },
        "upgrades": {
            "hpLevel": row["hp_level"],
            "speedLevel": row["speed_level"],
            "damageLevel": row["damage_level"],
            "firerateLevel": row["firerate_level"],
        },
        "multipliers": {
            "hp": get_upgrade_multiplier(row["hp_level"]),
            "speed": get_upgrade_multiplier(row["speed_level"]),
            "damage": get_upgrade_multiplier(row["damage_level"]),
            "firerate": get_upgrade_multiplier(row["firerate_level"]),
        },
        "stats": calculate_plane_stats(row),
    }


def select_player_plane(user_id, player_plane_id):
    player = get_or_create_player(user_id)
    if player is None:
        raise RuntimeError("Failed to get player")

    db = get_db_connection()

    try:
        with db.cursor() as cursor:
            cursor.execute(
                """
                SELECT id
                FROM player_planes
                WHERE id = %s
                AND player_id = %s
                """,
                (player_plane_id, player["id"]),
            )

            owned_plane = cursor.fetchone()

            if owned_plane is None:
                raise ValueError("Plane not owned by player")

            cursor.execute(
                """
                UPDATE players
                SET current_player_plane_id = %s
                WHERE id = %s
                """,
                (player_plane_id, player["id"]),
            )
    finally:
        db.close()

    return {
        "message": "Plane selected",
        "currentPlayerPlaneId": int(player_plane_id),
    }


def buy_plane(user_id, plane_id):
    player = get_or_create_player(user_id)
    if player is None:
        raise RuntimeError("Failed to get player")

    db = get_db_connection()

    try:
        with db.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, name, price
                FROM planes
                WHERE id = %s
                """,
                (plane_id,),
            )

            plane = cursor.fetchone()

            if plane is None:
                raise ValueError("Plane not found")

            cursor.execute(
                """
                SELECT id
                FROM player_planes
                WHERE player_id = %s
                AND plane_id = %s
                """,
                (player["id"], plane_id),
            )

            existing_plane = cursor.fetchone()

            if existing_plane is not None:
                raise ValueError("Plane already owned")

            if player["money"] < plane["price"]:
                raise ValueError("Not enough money")

            cursor.execute(
                """
                UPDATE players
                SET money = money - %s
                WHERE id = %s
                """,
                (plane["price"], player["id"]),
            )

            cursor.execute(
                """
                INSERT INTO player_planes (player_id, plane_id)
                VALUES (%s, %s)
                """,
                (player["id"], plane_id),
            )

            player_plane_id = cursor.lastrowid

            if player["current_player_plane_id"] is None:
                cursor.execute(
                    """
                    UPDATE players
                    SET current_player_plane_id = %s
                    WHERE id = %s
                    """,
                    (player_plane_id, player["id"]),
                )

            cursor.execute(
                """
                SELECT money
                FROM players
                WHERE id = %s
                """,
                (player["id"],),
            )

            updated_player = cursor.fetchone()
    finally:
        db.close()
    if updated_player is None:
        raise RuntimeError("Failed to fetch player")

    return {
        "message": "Plane purchased",
        "playerPlaneId": player_plane_id,
        "planeId": int(plane_id),
        "money": updated_player["money"],
    }


def upgrade_plane(user_id, player_plane_id, stat):
    stat = stat.strip().lower()

    if stat not in VALID_UPGRADE_STATS:
        raise ValueError("Invalid upgrade stat")

    column_name = VALID_UPGRADE_STATS[stat]
    player = get_or_create_player(user_id)
    if player is None:
        raise RuntimeError("Failed to get player")

    db = get_db_connection()

    try:
        with db.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT
                    pp.id,
                    pp.{column_name} AS current_level,
                    p.money
                FROM player_planes pp
                JOIN players p ON p.id = pp.player_id
                WHERE pp.id = %s
                AND pp.player_id = %s
                """,
                (player_plane_id, player["id"]),
            )

            row = cursor.fetchone()

            if row is None:
                raise ValueError("Plane not owned by player")

            current_level = row["current_level"]

            if current_level >= MAX_UPGRADE_LEVEL:
                raise ValueError("Upgrade is already at max level")

            new_level = current_level + 1
            upgrade_price = get_upgrade_price(new_level)

            if row["money"] < upgrade_price:
                raise ValueError("Not enough money")

            cursor.execute(
                """
                UPDATE players
                SET money = money - %s
                WHERE id = %s
                """,
                (upgrade_price, player["id"]),
            )

            cursor.execute(
                f"""
                UPDATE player_planes
                SET {column_name} = %s
                WHERE id = %s
                AND player_id = %s
                """,
                (new_level, player_plane_id, player["id"]),
            )

            cursor.execute(
                """
                SELECT money
                FROM players
                WHERE id = %s
                """,
                (player["id"],),
            )

            updated_player = cursor.fetchone()
    finally:
        db.close()
    if updated_player is None:
        raise RuntimeError("Failed to get player")

    return {
        "message": "Plane upgraded",
        "playerPlaneId": int(player_plane_id),
        "stat": stat,
        "newLevel": new_level,
        "newMultiplier": get_upgrade_multiplier(new_level),
        "upgradePrice": upgrade_price,
        "money": updated_player["money"],
    }