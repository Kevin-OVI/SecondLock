from __future__ import annotations

import asyncio
import re
import sqlite3

import bcrypt
from aiohttp import hdrs
from aiohttp.web import StreamResponse, HTTPNoContent

from core_utilities import CustomRequest, CustomHTTPException, HTTPStatus
from decorators import route
from module_loader import ModulesManager, HTTPModule
from .a2f import generate_code, next_timecode_in
from .auth import generate_token, SecretEncryptor, raise_invalid_token
from ..utils import load_json_request, verify_content, basic_ip_ratelimit, make_json_response, check_ratelimit

USERNAME_PATTERN = re.compile(r"[a-z0-9\-_]{4,16}")


class APIModule(HTTPModule):
    __slots__ = ("db", "tokens", "reverse_tokens")

    def __init__(self):
        super().__init__()

        self.db = sqlite3.connect("database.db")
        self.db.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, passhash TEXT)")
        self.db.execute("CREATE TABLE IF NOT EXISTS sites (id INTEGER PRIMARY KEY AUTOINCREMENT, user INT, name TEXT, secret BLOB)")
        self.db.execute("CREATE INDEX IF NOT EXISTS idx_sites_user ON sites (user)")

        self.tokens: dict[str, tuple[int, asyncio.Task]] = {}
        self.reverse_tokens: dict[int, set[str]] = {}

    async def on_unload(self):
        for _, task in self.tokens.values():
            task.cancel()
        self.db.close()

    def start_token_expiration_task(self, token: str) -> asyncio.Task:
        async def _delay():
            await asyncio.sleep(600)
            self.invalidate_token(token, False)

        return self.create_task(_delay())

    def invalidate_token(self, token: str, cancel_task: bool = True):
        user_id, task = self.tokens.pop(token)
        if cancel_task:
            task.cancel()

        user_tokens = self.reverse_tokens[user_id]
        user_tokens.discard(token)
        if not user_tokens:
            del self.reverse_tokens[user_id]

    def save_token(self, token: str, user_id: int):
        self.tokens[token] = (user_id, self.start_token_expiration_task(token))
        user_tokens = self.reverse_tokens.get(user_id)
        if user_tokens is None:
            self.reverse_tokens[user_id] = user_tokens = set()
        user_tokens.add(token)

    def check_authorization(self, request: CustomRequest) -> tuple[int, str]:
        token = request.headers.get(hdrs.AUTHORIZATION)
        if token is None:
            raise_invalid_token()
        token_data = self.tokens.get(token)
        if token_data is None:
            raise_invalid_token()
        return token_data[0], token

    @route("POST", "/api/login")
    @check_ratelimit(basic_ip_ratelimit(5, 1800))
    async def post_login(self, request: CustomRequest) -> StreamResponse:
        request_payload = await load_json_request(request)
        if not isinstance(request_payload, dict):
            raise CustomHTTPException.only_explain(HTTPStatus.BAD_REQUEST, "JSON content must be an object")
        username = request_payload.get("username")
        verify_content(username, "The 'username' is required", str, "The 'username' must be a string")
        username = username.lower()
        password = request_payload.get("password")
        verify_content(password, "The 'password' is required", str, "The 'password' must be a string")
        password = password.encode("utf-8")
        res = self.db.execute("SELECT id, passhash FROM users WHERE username=?", (username,)).fetchone()
        if res is None:
            raise CustomHTTPException.only_explain(HTTPStatus.UNAUTHORIZED, "Wrong username or password")

        user_id, passhash = res
        if not bcrypt.checkpw(password, passhash):
            raise CustomHTTPException.only_explain(HTTPStatus.UNAUTHORIZED, "Wrong username or password")

        token = generate_token(password)
        self.save_token(token, user_id)

        return make_json_response(HTTPStatus.OK, {"token": token})

    @route("POST", "/api/register")
    @check_ratelimit(basic_ip_ratelimit(1, 1800))
    async def post_register(self, request: CustomRequest) -> StreamResponse:
        request_payload = await load_json_request(request)
        if not isinstance(request_payload, dict):
            raise CustomHTTPException.only_explain(HTTPStatus.BAD_REQUEST, "JSON content must be an object")
        username = request_payload.get("username")
        verify_content(username, "The 'username' is required", str, "The 'username' must be a string")
        username = username.lower()
        if not USERNAME_PATTERN.fullmatch(username):
            raise CustomHTTPException.only_explain(HTTPStatus.BAD_REQUEST, "The 'username' can only contain lowercase letters, numbers, underscores and carets")
        password = request_payload.get("password")
        verify_content(password, "The 'password' is required",
            str, "The 'password' must be a string")
        password = password.encode("utf-8")

        passhash = bcrypt.hashpw(password, bcrypt.gensalt())
        with self.db:
            try:
                self.db.execute("INSERT INTO users (username, passhash) VALUES (?, ?)", (username, passhash))
            except sqlite3.IntegrityError:
                raise CustomHTTPException.only_explain(HTTPStatus.CONFLICT, "The 'username' is already used")
            user_id = self.db.execute("SELECT id FROM users WHERE username=?", (username,)).fetchone()[0]

        token = generate_token(password)
        self.save_token(token, user_id)
        return make_json_response(HTTPStatus.CREATED, {"token": token})

    @route("POST", "/api/sites")
    async def post_site(self, request: CustomRequest) -> StreamResponse:
        user_id, token = self.check_authorization(request)

        request_payload = await load_json_request(request)
        if not isinstance(request_payload, dict):
            raise CustomHTTPException.only_explain(HTTPStatus.BAD_REQUEST, "JSON content must be an object")
        name = request_payload.get("name")
        verify_content(name, "The 'name' is required", str, "The 'name' must be a string")
        if len(name) > 64:
            raise CustomHTTPException.only_explain(HTTPStatus.BAD_REQUEST, "The 'name' must be at most 64 characters")
        secret = request_payload.get("secret")
        verify_content(secret, "The 'secret' is required", str, "The 'secret' must be a string")

        code = generate_code(secret)
        encryptor = SecretEncryptor(token)
        encrypted_secret = encryptor.encrypt_string(secret)
        with self.db:
            self.db.execute("INSERT INTO sites (user, name, secret) VALUES (?, ?, ?)", (user_id, name, encrypted_secret))
            site_id = self.db.execute("SELECT id FROM sites WHERE name=?", (name,)).fetchone()[0]
        return make_json_response(HTTPStatus.CREATED, {"id": site_id, "name": name, "code": code, "next_update": next_timecode_in()})

    @route("GET", "/api/sites")
    async def get_sites(self, request: CustomRequest) -> StreamResponse:
        user_id, token = self.check_authorization(request)
        sites = []
        encryptor = SecretEncryptor(token)

        for site_id, name, encrypted_secret in self.db.execute("SELECT id, name, secret FROM sites WHERE user=?", (user_id,)):
            sites.append({
                "id": site_id,
                "name": name,
                "code": generate_code(encryptor.decrypt_string(encrypted_secret))
            })

        return make_json_response(HTTPStatus.OK, {"sites": sites, "next_update": next_timecode_in()})

    @route("PATCH", "/api/sites/{id:\\d+}")
    async def patch_site(self, request) -> StreamResponse:
        user_id, token = self.check_authorization(request)
        request_payload = await load_json_request(request)
        site_id = int(request.match_info["id"])
        name = request_payload.get("name")
        verify_content(name, "The 'name' is required", str, "The 'name' must be a string")
        if len(name) > 64:
            raise CustomHTTPException.only_explain(HTTPStatus.BAD_REQUEST, "The 'name' must be at most 64 characters")

        with self.db:
            rowcount = self.db.execute("UPDATE sites SET name=? WHERE id=? AND user=?", (user_id, site_id)).rowcount

        if rowcount == 0:
            raise CustomHTTPException(HTTPStatus.NOT_FOUND)

        encryptor = SecretEncryptor(token)
        encrypted_secret = self.db.execute("SELECT secret FROM sites WHERE id=?").fetchone()[0]
        secret = encryptor.decrypt_string(encrypted_secret)
        code = generate_code(secret)

        return make_json_response(HTTPStatus.OK, {"id": site_id, "name": name, "code": code})

    @route("DELETE", "/api/sites/{id:\\d+}")
    async def delete_site(self, request: CustomRequest) -> StreamResponse:
        user_id, _ = self.check_authorization(request)
        site_id = int(request.match_info["id"])
        with self.db:
            rowcount = self.db.execute("DELETE FROM sites WHERE user=? AND id=?", (user_id, site_id)).rowcount
        if rowcount == 0:
            raise CustomHTTPException(HTTPStatus.NOT_FOUND)
        return HTTPNoContent()


async def setup(modules_manager: ModulesManager):
    modules_manager.add_http_module(APIModule())
