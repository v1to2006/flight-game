from werkzeug.security import generate_password_hash, check_password_hash

from app.db.connection import get_db_connection
from app.auth.models.user import User


def create_user(username, password):
    password_hash = generate_password_hash(password)

    db = get_db_connection()

    try:
        with db.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO users (username, password_hash)
                VALUES (%s, %s)
                """,
                (username, password_hash),
            )

            user_id = cursor.lastrowid

        from app.player.service import create_player_profile

        create_player_profile(user_id)

    finally:
        db.close()


def get_user_by_id(user_id):
    db = get_db_connection()

    try:
        with db.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, username
                FROM users
                WHERE id = %s
                """,
                (user_id,),
            )

            row = cursor.fetchone()
    finally:
        db.close()

    if row is None:
        return None

    return User.from_row(row)


def get_user_by_username(username):
    db = get_db_connection()

    try:
        with db.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, username, password_hash
                FROM users
                WHERE username = %s
                """,
                (username,),
            )

            return cursor.fetchone()
    finally:
        db.close()


def verify_user(username, password):
    row = get_user_by_username(username)

    if row is None:
        return None

    password_is_valid = check_password_hash(row["password_hash"], password)

    if not password_is_valid:
        return None

    return User.from_row(row)