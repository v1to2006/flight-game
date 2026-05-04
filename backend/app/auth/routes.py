import pymysql
from flask import Blueprint, jsonify, request
from flask_login import current_user, login_user, logout_user

from app.extensions import login_manager
from app.auth.service import create_user, get_user_by_id, verify_user

auth_bp = Blueprint("auth", __name__)


@login_manager.user_loader
def load_user(user_id):
    return get_user_by_id(user_id)


@login_manager.unauthorized_handler
def unauthorized():
    return jsonify({"error": "Authentication required"}), 401


@auth_bp.post("/register")
def register():
    data = request.get_json() or {}

    username = data.get("username", "").strip().lower()
    password = data.get("password", "")
    
    min_username_length = 3
    min_password_length = 8
    
    if len(username) < min_username_length:
        return jsonify({"error": f"Username must be at least {min_username_length} characters"}), 400

    if len(password) < min_password_length:
        return jsonify({"error": f"Password must be at least {min_password_length} characters"}), 400

    try:
        create_user(username, password)

    except pymysql.err.IntegrityError:
        return jsonify({
            "error": "Username already exists"
        }), 409
    
    return jsonify({
            "message": "User registered successfully"
        }), 201


@auth_bp.post("/login")
def login():
    data = request.get_json() or {}

    username = data.get("username", "").strip().lower()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    user = verify_user(username, password)

    if user is None:
        return jsonify({"error": "Invalid username or password"}), 401

    login_user(user)

    return jsonify({
        "message": "Logged in successfully",
        "user": {
            "id": user.id,
            "username": user.username,
        },
    })


@auth_bp.post("/logout")
def logout():
    logout_user()

    return jsonify({
        "message": "Logged out successfully"
    })


@auth_bp.get("/me")
def me():
    if not current_user.is_authenticated:
        return jsonify({
            "loggedIn": False
        }), 401

    return jsonify({
        "loggedIn": True,
        "user": {
            "id": current_user.id,
            "username": current_user.username,
        },
    })