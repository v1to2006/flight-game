from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

from app.config import Config
from app.extensions import login_manager
from app.auth.routes import auth_bp
from app.player.routes import player_bp
from app.game.routes import game_bp


def create_app():
    load_dotenv()

    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": app.config["FRONTEND_ORIGINS"],
            }
        },
        supports_credentials=True,
    )

    login_manager.init_app(app)

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(player_bp, url_prefix="/api/player")
    app.register_blueprint(game_bp, url_prefix="/api/game")

    return app