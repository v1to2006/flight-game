from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

from app.config import Config
from app.extensions import login_manager
from app.auth.routes import auth_bp


def create_app():
    load_dotenv()

    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": [app.config["FRONTEND_ORIGIN"]],
            }
        },
        supports_credentials=True,
    )

    login_manager.init_app(app)

    app.register_blueprint(auth_bp, url_prefix="/api/auth")

    return app