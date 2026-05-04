from flask_login import UserMixin


class User(UserMixin):
    def __init__(self, id, username):
        self.id = str(id)
        self.username = username

    @staticmethod
    def from_row(row):
        return User(
            id=row["id"],
            username=row["username"],
        )