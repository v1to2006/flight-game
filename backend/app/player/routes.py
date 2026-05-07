from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from app.player.service import (
    buy_plane,
    get_owned_planes,
    get_player_profile,
    get_shop_planes,
    select_player_plane,
    upgrade_plane,
)

player_bp = Blueprint("player", __name__)


def get_current_user_id():
    return int(current_user.id)


@player_bp.get("/profile")
@login_required
def profile():
    return jsonify({
        "player": get_player_profile(get_current_user_id())
    })


@player_bp.get("/planes")
@login_required
def planes():
    return jsonify({
        "planes": get_owned_planes(get_current_user_id())
    })


@player_bp.get("/planes/shop")
@login_required
def shop_planes():
    return jsonify({
        "planes": get_shop_planes(get_current_user_id())
    })


@player_bp.post("/planes/select")
@login_required
def select_plane():
    data = request.get_json() or {}

    player_plane_id = data.get("playerPlaneId")

    if player_plane_id is None:
        return jsonify({"error": "playerPlaneId is required"}), 400

    try:
        result = select_player_plane(get_current_user_id(), player_plane_id)
        return jsonify(result)

    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@player_bp.post("/planes/buy")
@login_required
def buy():
    data = request.get_json() or {}

    plane_id = data.get("planeId")

    if plane_id is None:
        return jsonify({"error": "planeId is required"}), 400

    try:
        result = buy_plane(get_current_user_id(), plane_id)
        return jsonify(result), 201

    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@player_bp.post("/planes/upgrade")
@login_required
def upgrade():
    data = request.get_json() or {}

    player_plane_id = data.get("playerPlaneId")
    stat = data.get("stat", "")

    if player_plane_id is None:
        return jsonify({"error": "playerPlaneId is required"}), 400

    if not stat:
        return jsonify({"error": "stat is required"}), 400

    try:
        result = upgrade_plane(get_current_user_id(), player_plane_id, stat)
        return jsonify(result)

    except ValueError as error:
        return jsonify({"error": str(error)}), 400