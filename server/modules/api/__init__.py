from __future__ import annotations

import sqlite3

from aiohttp.web import StreamResponse, HTTPNoContent

from core_utilities import CustomRequest, CustomHTTPException, HTTPStatus
from decorators import route
from module_loader import ModulesManager, HTTPModule
from .a2f import generate_code, next_timecode_in
from .auth import TokenEncryptorManager, Token, raise_invalid_token, gen_bcrypt, check_bcrypt, DUMMY_HASH
from .models import LoginRegisterModel, CreateSiteModel, UpdateSiteModel, UpdateUserModel, DangerousActionModel
from ..utils import basic_ip_ratelimit, make_json_response, RateLimitChecker, ip_lock, parse_json_content


class APIModule(HTTPModule):
    __slots__ = ("db", "token_encryptor_manager", "login_ratelimit", "register_ratelimit")

    def __init__(self):
        super().__init__()

        self.db = sqlite3.connect("database.db")
        with self.db:
            self.db.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, passhash BLOB)")
            self.db.execute("CREATE TABLE IF NOT EXISTS sites (id INTEGER PRIMARY KEY AUTOINCREMENT, user INT, name BLOB, secret BLOB, FOREIGN KEY(user) REFERENCES users(id))")
            self.db.execute("CREATE INDEX IF NOT EXISTS idx_sites_user ON sites (user)")

        self.token_encryptor_manager = TokenEncryptorManager(10 * 60, 3, "2FA")

        self.login_ratelimit = RateLimitChecker(basic_ip_ratelimit(5, 1800))
        self.register_ratelimit = RateLimitChecker(basic_ip_ratelimit(1, 1800))

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

    @route("POST", "/api/login")
    @ip_lock
    async def post_login(self, request: CustomRequest) -> StreamResponse:
        await self.login_ratelimit.check_ratelimit(self, request)
        login_payload = await parse_json_content(request, LoginRegisterModel)
        await self.login_ratelimit.count_request(self, request)

        res = self.db.execute("SELECT id, passhash FROM users WHERE username=?", (login_payload.username,)).fetchone()
        if res is None:
            # Ajouter du temps suplémentaire pour éviter de savoir facilement si le nom d'utilisateur existe ou pas en vérifiant contre un hash factice
            await check_bcrypt(login_payload.password, b"$2b$12$HvkQ9QWZ0yIsZdCGJaTTdODZFi8XdGxmAl0pxmW.dqoBQNpVu7r8u")
            raise CustomHTTPException.only_explain(HTTPStatus.UNAUTHORIZED, "Incorrect username or password")
        user_id, db_passhash = res

        if not await check_bcrypt(login_payload.password, db_passhash):
            raise CustomHTTPException.only_explain(HTTPStatus.UNAUTHORIZED, "Incorrect username or password")

        return make_json_response(HTTPStatus.OK, {
            "username": login_payload.username,
            "token": self.token_encryptor_manager.generate_token(user_id, login_payload.password)
        })

    @route("POST", "/api/register")
    @ip_lock
    async def post_register(self, request: CustomRequest) -> StreamResponse:
        await self.register_ratelimit.check_ratelimit(self, request)
        register_payload = await parse_json_content(request, LoginRegisterModel)

        if self.db.execute("SELECT id FROM users WHERE username=?", (register_payload.username,)).fetchone() is not None:
            raise CustomHTTPException.only_explain(HTTPStatus.CONFLICT, "The 'username' is already used")

        passhash_db = await gen_bcrypt(register_payload.password)
        with self.db:
            try:
                user_id = self.db.execute("INSERT INTO users (username, passhash) VALUES (?, ?) RETURNING id",
                    (register_payload.username, passhash_db)).fetchone()[0]
            except sqlite3.IntegrityError:
                raise CustomHTTPException.only_explain(HTTPStatus.CONFLICT, "The 'username' is already used")
            await self.register_ratelimit.count_request(self, request)

        return make_json_response(HTTPStatus.CREATED, {
            "username": register_payload.username,
            "token": self.token_encryptor_manager.generate_token(user_id, register_payload.password)
        })

    @route("POST", "/api/sites")
    async def post_site(self, request: CustomRequest) -> StreamResponse:
        token = self.check_authorization(request)
        site_payload = await parse_json_content(request, CreateSiteModel)

        code = generate_code(site_payload.secret)
        encrypted_name = token.encrypt_string(site_payload.name)
        encrypted_secret = token.encrypt_string(site_payload.secret)
        with self.db:
            site_id = self.db.execute("INSERT INTO sites (user, name, secret) VALUES (?, ?, ?) RETURNING id",
                (token.user_id, encrypted_name, encrypted_secret)).fetchone()[0]
        return make_json_response(HTTPStatus.CREATED, {
            "id": site_id,
            "name": site_payload.name,
            "code": code,
            "next_update": next_timecode_in()
        })

    @route("GET", "/api/sites")
    async def get_sites(self, request: CustomRequest) -> StreamResponse:
        token = self.check_authorization(request)
        sites = []

        for site_id, encrypted_name, encrypted_secret in self.db.execute("SELECT id, name, secret FROM sites WHERE user=?", (token.user_id,)):
            sites.append({
                "id": site_id,
                "name": token.decrypt_string(encrypted_name),
                "code": generate_code(token.decrypt_string(encrypted_secret))
            })

        return make_json_response(HTTPStatus.OK, {
            "sites": sites,
            "next_update": next_timecode_in()
        })

    @route("PATCH", "/api/sites/{id:\\d+}")
    async def patch_site(self, request) -> StreamResponse:
        token = self.check_authorization(request)
        site_payload = await parse_json_content(request, UpdateSiteModel)
        site_id = int(request.match_info["id"])

        encrypted_name = token.encrypt_string(site_payload.name)
        with self.db:
            res = self.db.execute("UPDATE sites SET name=? WHERE id=? AND user=? RETURNING secret",
                (encrypted_name, site_id, token.user_id)).fetchone()
            if res is None:
                raise CustomHTTPException(HTTPStatus.NOT_FOUND)
            encrypted_secret = res[0]

        code = generate_code(token.decrypt_string(encrypted_secret))
        return make_json_response(HTTPStatus.OK, {
            "id": site_id,
            "name": site_payload.name,
            "code": code,
            "next_update": next_timecode_in()
        })

    @route("DELETE", "/api/sites/{id:\\d+}")
    async def delete_site(self, request: CustomRequest) -> StreamResponse:
        token = self.check_authorization(request)
        site_id = int(request.match_info["id"])

        with self.db:
            rowcount = self.db.execute("DELETE FROM sites WHERE id=? AND user=?", (site_id, token.user_id)).rowcount
        if rowcount == 0:
            raise CustomHTTPException(HTTPStatus.NOT_FOUND)
        return HTTPNoContent()

    @route("PATCH", "/api/user")
    async def patch_user(self, request: CustomRequest) -> StreamResponse:
        old_token, (old_username, old_passhash_db) = self.check_authorization_advanced(request)
        update_user_payload = await parse_json_content(request, UpdateUserModel)
        if not old_token.is_correct_password(update_user_payload.password):
            raise CustomHTTPException.only_explain(HTTPStatus.FORBIDDEN, "Incorrect old password")

        new_username = update_user_payload.new_username or old_username
        new_passhash_db = old_passhash_db if update_user_payload.new_password is None else await gen_bcrypt(update_user_payload.new_password)
        token_string, new_token = self.token_encryptor_manager.regenerate_token(old_token, update_user_payload.new_password)

        with self.db:
            try:
                self.db.execute("UPDATE users SET username=?, passhash=? WHERE id=?", (new_username, new_passhash_db, old_token.user_id))
            except sqlite3.IntegrityError:
                raise CustomHTTPException.only_explain(HTTPStatus.CONFLICT, "The 'username' is already used")
            if update_user_payload.new_password is not None:
                self.db.executemany("UPDATE sites SET name=?, secret=? WHERE id=?", (
                    (
                        new_token.encrypt_string(old_token.decrypt_string(encrypted_name)),
                        new_token.encrypt_string(old_token.decrypt_string(encrypted_secret)),
                        site_id
                    ) for site_id, encrypted_name, encrypted_secret in
                    self.db.execute("SELECT id, name, secret FROM sites WHERE user=?", (old_token.user_id,))
                ))

            self.token_encryptor_manager.invalidate_tokens_before(new_token)

        return make_json_response(HTTPStatus.OK, {
            "username": new_username,
            "token": token_string
        })

    @route("DELETE", "/api/user")
    async def delete_user(self, request: CustomRequest) -> StreamResponse:
        token = self.check_authorization(request)
        delete_user_payload = await parse_json_content(request, DangerousActionModel)

        if not token.is_correct_password(delete_user_payload.password):
            raise CustomHTTPException.only_explain(HTTPStatus.FORBIDDEN, "Incorrect password")

        with self.db:
            self.db.execute("DELETE FROM sites WHERE user=?", (token.user_id,))
            self.db.execute("DELETE FROM users WHERE id=?", (token.user_id,))
            self.token_encryptor_manager.cancel_tokens_expiration(token.user_id)

        return HTTPNoContent()


async def setup(modules_manager: ModulesManager):
    modules_manager.add_http_module(APIModule())
