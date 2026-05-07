import random

from app.db.connection import get_db_connection
from app.player.service import get_or_create_player

AIRPORT_TYPES_FOR_CAMPAIGN = (
    "small_airport",
    "medium_airport",
    "large_airport",
)

HELSINKI_AIRPORT_IDENT = "EFHK"
MINIBOSS_AIRPORT_IDENT = "EPKE"
BOSS_AIRPORT_IDENT = "EDDB"

DIFFICULTY_EASY_ID = 1
DIFFICULTY_MEDIUM_ID = 2
DIFFICULTY_HARD_ID = 3
DIFFICULTY_MINIBOSS_ID = 4
DIFFICULTY_BOSS_ID = 5

REWARDS_BY_DIFFICULTY_ID = {
    DIFFICULTY_EASY_ID: 100,
    DIFFICULTY_MEDIUM_ID: 200,
    DIFFICULTY_HARD_ID: 350,
    DIFFICULTY_MINIBOSS_ID: 650,
    DIFFICULTY_BOSS_ID: 1000,
}


def start_new_game(user_id):
    player = get_or_create_player(user_id)

    if player is None:
        raise RuntimeError("Failed to get player")

    db = get_db_connection()

    try:
        with db.cursor() as cursor:
            cursor.execute(
                """
                UPDATE game_sessions
                SET status = 'abandoned'
                WHERE player_id = %s
                AND status = 'active'
                """,
                (player["id"],),
            )

            cursor.execute(
                """
                INSERT INTO game_sessions (player_id)
                VALUES (%s)
                """,
                (player["id"],),
            )

            game_session_id = cursor.lastrowid

            selected_airports = set()

            add_fixed_airports(cursor, game_session_id, selected_airports)
            add_random_campaign_airports(cursor, game_session_id, selected_airports)

            occupied_airports_count = get_airport_count(cursor, game_session_id)
    finally:
        db.close()

    return {
        "message": "New game started",
        "gameSessionId": game_session_id,
        "occupiedAirportsCount": occupied_airports_count,
    }


def add_fixed_airports(cursor, game_session_id, selected_airports):
    cursor.execute(
        """
        SELECT airport_ident, difficulty_id
        FROM campaign_fixed_airports
        ORDER BY difficulty_id, airport_ident
        """
    )

    fixed_airports = cursor.fetchall()

    for airport in fixed_airports:
        cursor.execute(
            """
            INSERT IGNORE INTO game_occupied_airports (
                game_session_id,
                airport_ident,
                difficulty_id
            )
            VALUES (%s, %s, %s)
            """,
            (
                game_session_id,
                airport["airport_ident"],
                airport["difficulty_id"],
            ),
        )

        selected_airports.add(airport["airport_ident"])


def add_random_campaign_airports(cursor, game_session_id, selected_airports):
    cursor.execute(
        """
        SELECT iso_country, difficulty_id, min_airports, max_airports
        FROM campaign_country_rules
        ORDER BY difficulty_id, iso_country
        """
    )

    country_rules = cursor.fetchall()

    for rule in country_rules:
        amount = random.randint(rule["min_airports"], rule["max_airports"])

        airports = get_random_airports_for_country(
            cursor=cursor,
            iso_country=rule["iso_country"],
            amount=amount,
            excluded_airports=selected_airports,
        )

        for airport in airports:
            cursor.execute(
                """
                INSERT IGNORE INTO game_occupied_airports (
                    game_session_id,
                    airport_ident,
                    difficulty_id
                )
                VALUES (%s, %s, %s)
                """,
                (
                    game_session_id,
                    airport["ident"],
                    rule["difficulty_id"],
                ),
            )

            selected_airports.add(airport["ident"])


def get_random_airports_for_country(cursor, iso_country, amount, excluded_airports):
    type_placeholders = ", ".join(["%s"] * len(AIRPORT_TYPES_FOR_CAMPAIGN))
    params = [iso_country, *AIRPORT_TYPES_FOR_CAMPAIGN]

    excluded_clause = ""

    if excluded_airports:
        excluded_placeholders = ", ".join(["%s"] * len(excluded_airports))
        excluded_clause = f"AND ident NOT IN ({excluded_placeholders})"
        params.extend(list(excluded_airports))

    params.append(amount)

    cursor.execute(
        f"""
        SELECT ident
        FROM airport
        WHERE iso_country = %s
        AND type IN ({type_placeholders})
        AND latitude_deg IS NOT NULL
        AND longitude_deg IS NOT NULL
        {excluded_clause}
        ORDER BY RAND()
        LIMIT %s
        """,
        params,
    )

    return cursor.fetchall()


def get_airport_count(cursor, game_session_id):
    cursor.execute(
        """
        SELECT COUNT(*) AS airport_count
        FROM game_occupied_airports
        WHERE game_session_id = %s
        """,
        (game_session_id,),
    )

    row = cursor.fetchone()

    return row["airport_count"]


def get_active_game_session(user_id):
    player = get_or_create_player(user_id)

    if player is None:
        raise RuntimeError("Failed to get player")

    db = get_db_connection()

    try:
        with db.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, player_id, status, started_at, completed_at
                FROM game_sessions
                WHERE player_id = %s
                AND status = 'active'
                ORDER BY started_at DESC
                LIMIT 1
                """,
                (player["id"],),
            )

            return cursor.fetchone()
    finally:
        db.close()


def continue_game(user_id):
    session = get_active_game_session(user_id)

    if session is None:
        return {
            "hasActiveGame": False,
            "message": "No active game found",
        }

    airports = get_game_airports(
        game_session_id=session["id"],
        include_liberated=True,
    )

    progress = get_game_progress(session["id"])

    return {
        "hasActiveGame": True,
        "gameSessionId": session["id"],
        "status": session["status"],
        "progress": progress,
        "airports": airports,
    }


def get_game_map(user_id):
    session = get_active_game_session(user_id)

    if session is None:
        return {
            "hasActiveGame": False,
            "occupiedAirports": [],
        }

    return {
        "hasActiveGame": True,
        "gameSessionId": session["id"],
        "occupiedAirports": get_game_airports(
            game_session_id=session["id"],
            include_liberated=False,
        ),
    }


def get_game_status(user_id):
    session = get_active_game_session(user_id)

    if session is None:
        return {
            "hasActiveGame": False,
            "message": "No active game found",
        }

    progress = get_game_progress(session["id"])

    return {
        "hasActiveGame": True,
        "gameSessionId": session["id"],
        "status": session["status"],
        **progress,
    }


def get_game_airports(game_session_id, include_liberated):
    db = get_db_connection()

    liberated_filter = ""

    if not include_liberated:
        liberated_filter = "AND goa.liberated = FALSE"

    try:
        with db.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT
                    goa.airport_ident,
                    goa.liberated,
                    goa.liberated_at,

                    a.name,
                    a.type,
                    a.iso_country,
                    a.municipality,
                    a.latitude_deg,
                    a.longitude_deg,

                    d.id AS difficulty_id,
                    d.name AS difficulty_name
                FROM game_occupied_airports goa
                JOIN airport a ON a.ident = goa.airport_ident
                JOIN difficulty_levels d ON d.id = goa.difficulty_id
                WHERE goa.game_session_id = %s
                {liberated_filter}
                ORDER BY d.id, a.iso_country, a.name
                """,
                (game_session_id,),
            )

            rows = cursor.fetchall()
    finally:
        db.close()

    return [format_airport(row) for row in rows]


def format_airport(row):
    return {
        "airportIdent": row["airport_ident"],
        "name": row["name"],
        "type": row["type"],
        "isoCountry": row["iso_country"],
        "municipality": row["municipality"],
        "latitude": row["latitude_deg"],
        "longitude": row["longitude_deg"],
        "liberated": bool(row["liberated"]),
        "difficulty": {
            "id": row["difficulty_id"],
            "name": row["difficulty_name"],
        },
    }


def get_game_progress(game_session_id):
    db = get_db_connection()

    try:
        with db.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    COUNT(*) AS total_airports,
                    SUM(CASE WHEN liberated = TRUE THEN 1 ELSE 0 END) AS liberated_airports,
                    SUM(CASE WHEN liberated = FALSE THEN 1 ELSE 0 END) AS remaining_airports
                FROM game_occupied_airports
                WHERE game_session_id = %s
                """,
                (game_session_id,),
            )

            row = cursor.fetchone()
    finally:
        db.close()

    if row is None:
        raise RuntimeError("Failed to fetch game progress")

    total_airports = int(row["total_airports"] or 0)
    liberated_airports = int(row["liberated_airports"] or 0)
    remaining_airports = int(row["remaining_airports"] or 0)

    return {
        "totalAirports": total_airports,
        "liberatedAirports": liberated_airports,
        "remainingAirports": remaining_airports,
    }


def liberate_airport(user_id, airport_ident):
    airport_ident = airport_ident.strip().upper()

    if not airport_ident:
        raise ValueError("airportIdent is required")

    player = get_or_create_player(user_id)

    if player is None:
        raise RuntimeError("Failed to get player")

    session = get_active_game_session(user_id)

    if session is None:
        raise ValueError("No active game found")

    db = get_db_connection()

    try:
        with db.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    goa.id,
                    goa.airport_ident,
                    goa.liberated,
                    goa.difficulty_id,
                    d.name AS difficulty_name
                FROM game_occupied_airports goa
                JOIN difficulty_levels d ON d.id = goa.difficulty_id
                WHERE goa.game_session_id = %s
                AND goa.airport_ident = %s
                """,
                (session["id"], airport_ident),
            )

            occupied_airport = cursor.fetchone()

            if occupied_airport is None:
                raise ValueError("Airport is not part of the active game")

            if occupied_airport["liberated"]:
                progress = get_game_progress(session["id"])

                return {
                    "message": "Airport already liberated",
                    "airportIdent": airport_ident,
                    "remainingAirports": progress["remainingAirports"],
                    "reward": {
                        "money": 0,
                    },
                    "gameCompleted": False,
                }

            reward_money = REWARDS_BY_DIFFICULTY_ID.get(
                occupied_airport["difficulty_id"],
                0,
            )

            cursor.execute(
                """
                UPDATE game_occupied_airports
                SET liberated = TRUE,
                    liberated_at = NOW()
                WHERE id = %s
                """,
                (occupied_airport["id"],),
            )

            cursor.execute(
                """
                UPDATE players
                SET money = money + %s
                WHERE id = %s
                """,
                (reward_money, player["id"]),
            )

            cursor.execute(
                """
                SELECT COUNT(*) AS remaining_airports
                FROM game_occupied_airports
                WHERE game_session_id = %s
                AND liberated = FALSE
                """,
                (session["id"],),
            )

            remaining_row = cursor.fetchone()

            if remaining_row is None:
                raise RuntimeError("Failed to fetch remaining row")

            remaining_airports = int(remaining_row["remaining_airports"] or 0)

            game_completed = (
                airport_ident == BOSS_AIRPORT_IDENT
                or remaining_airports == 0
            )

            if game_completed:
                cursor.execute(
                    """
                    UPDATE game_sessions
                    SET status = 'completed',
                        completed_at = NOW()
                    WHERE id = %s
                    """,
                    (session["id"],),
                )
    finally:
        db.close()

    response = {
        "message": "Airport liberated",
        "airportIdent": airport_ident,
        "remainingAirports": remaining_airports,
        "reward": {
            "money": reward_money,
        },
        "gameCompleted": game_completed,
    }

    if airport_ident == MINIBOSS_AIRPORT_IDENT:
        response["event"] = {
            "type": "miniboss_defeated",
            "title": "Miniboss defeated",
            "subtitle": "Wolfsschanze neutralized",
        }

    if game_completed:
        response["ending"] = {
            "type": "victory",
            "title": "Victory",
            "subtitle": "Berlin Liberated",
        }

    return response