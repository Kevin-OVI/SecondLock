import sqlite3

from core_utilities import CustomRequest
from module_loader import HTTPModule, ModulesManager
from ..utils.auth import Token, TokenEncryptorManager, raise_invalid_token


class APICoreModule(HTTPModule):
    __slots__ = ("db", "token_encryptor_manager")

    def __init__(self):
        super().__init__()

        self.db = sqlite3.connect("database.db")
        with self.db:
            self.db.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, passhash BLOB)")
            self.db.execute("CREATE TABLE IF NOT EXISTS sites (id INTEGER PRIMARY KEY AUTOINCREMENT, user INT, name BLOB, secret BLOB, FOREIGN KEY(user) REFERENCES users(id))")
            self.db.execute("CREATE INDEX IF NOT EXISTS idx_sites_user ON sites (user)")

        self.token_encryptor_manager = TokenEncryptorManager(10 * 60, 3, "2FA")

    async def on_unload(self):
        self.db.close()

    def check_authorization_advanced(self, request: CustomRequest) -> tuple[Token, tuple[str, bytes]]:
        token = self.token_encryptor_manager.get_token(request)
        res = self.db.execute("SELECT username, passhash FROM users WHERE id=?", (token.user_id,)).fetchone()
        if res is None:
            raise_invalid_token()
        return token, res

    def check_authorization(self, request: CustomRequest) -> Token:
        token = self.token_encryptor_manager.get_token(request)
        if not self.db.execute("SELECT ? IN (SELECT id FROM users)", (token.user_id,)).fetchone()[0]:
            raise_invalid_token()
        return token


async def setup(modules_manager: ModulesManager):
    modules_manager.add_http_module(APICoreModule())
