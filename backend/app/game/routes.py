from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from app.game.service import (
    continue_game,
    get_game_map,
    get_game_status,
    liberate_airport,
    start_new_game,
)

game_bp = Blueprint("game", __name__)


def get_current_user_id():
    return int(current_user.id)


@game_bp.post("/start")
@login_required
def start():
    try:
        result = start_new_game(get_current_user_id())
        return jsonify(result), 201

    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@game_bp.get("/continue")
@login_required
def continue_active_game():
    return jsonify(continue_game(get_current_user_id()))


@game_bp.get("/map")
@login_required
def map_data():
    return jsonify(get_game_map(get_current_user_id()))


@game_bp.get("/status")
@login_required
def status():
    return jsonify(get_game_status(get_current_user_id()))


@game_bp.post("/airports/liberate")
@login_required
def liberate():
    data = request.get_json() or {}

    airport_ident = data.get("airportIdent", "")

    if not airport_ident:
        return jsonify({"error": "airportIdent is required"}), 400

    try:
        result = liberate_airport(get_current_user_id(), airport_ident)
        return jsonify(result)

    except ValueError as error:
        return jsonify({"error": str(error)}), 400