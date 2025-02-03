import sqlite3

from aiohttp.web_exceptions import HTTPNoContent
from aiohttp.web_response import StreamResponse

from core_utilities import CustomHTTPException, CustomRequest, HTTPStatus
from decorators import route
from module_loader import HTTPModule, ModulesManager
from ..utils.auth import check_bcrypt, gen_bcrypt
from ..utils.models import DangerousActionModel, LoginRegisterModel, UpdateUserModel
from ...utils import (
    RateLimitChecker,
    basic_ip_ratelimit,
    ip_lock,
    make_json_response,
    parse_json_content,
)


class APIAuthenticationModule(HTTPModule):
    __slots__ = ("core", "login_ratelimit", "register_ratelimit")

    def __init__(self):
        super().__init__()
        from ..core import APICoreModule

        self.core = self.modules_manager.get_module(APICoreModule)

        self.login_ratelimit = RateLimitChecker(basic_ip_ratelimit(5, 1800))
        self.register_ratelimit = RateLimitChecker(basic_ip_ratelimit(1, 1800))

    @route("POST", "/api/login")
    @ip_lock
    async def post_login(self, request: CustomRequest) -> StreamResponse:
        await self.login_ratelimit.check_ratelimit(self, request)
        login_payload = await parse_json_content(request, LoginRegisterModel)
        await self.login_ratelimit.count_request(self, request)

        res = self.core.db.execute(
            "SELECT id, passhash FROM users WHERE username=?", (login_payload.username,)
        ).fetchone()
        if res is None:
            # Ajouter du temps suplémentaire pour éviter de savoir facilement si le nom d'utilisateur existe ou pas en vérifiant contre un hash factice
            await check_bcrypt(
                login_payload.password,
                b"$2b$12$HvkQ9QWZ0yIsZdCGJaTTdODZFi8XdGxmAl0pxmW.dqoBQNpVu7r8u",
            )
            raise CustomHTTPException.only_explain(
                HTTPStatus.UNAUTHORIZED, "Incorrect username or password"
            )
        user_id, db_passhash = res

        if not await check_bcrypt(login_payload.password, db_passhash):
            raise CustomHTTPException.only_explain(
                HTTPStatus.UNAUTHORIZED, "Incorrect username or password"
            )

        return make_json_response(
            HTTPStatus.OK,
            {
                "username": login_payload.username,
                "token": self.core.token_encryptor_manager.generate_token(
                    user_id, login_payload.password
                ),
            },
        )

    @route("POST", "/api/register")
    @ip_lock
    async def post_register(self, request: CustomRequest) -> StreamResponse:
        await self.register_ratelimit.check_ratelimit(self, request)
        register_payload = await parse_json_content(request, LoginRegisterModel)

        if (
            self.core.db.execute(
                "SELECT id FROM users WHERE username=?", (register_payload.username,)
            ).fetchone()
            is not None
        ):
            raise CustomHTTPException.only_explain(
                HTTPStatus.CONFLICT, "The 'username' is already used"
            )

        passhash_db = await gen_bcrypt(register_payload.password)
        with self.core.db:
            try:
                user_id = self.core.db.execute(
                    "INSERT INTO users (username, passhash) VALUES (?, ?) RETURNING id",
                    (register_payload.username, passhash_db),
                ).fetchone()[0]
            except sqlite3.IntegrityError:
                raise CustomHTTPException.only_explain(
                    HTTPStatus.CONFLICT, "The 'username' is already used"
                )
            await self.register_ratelimit.count_request(self, request)

        return make_json_response(
            HTTPStatus.CREATED,
            {
                "username": register_payload.username,
                "token": self.core.token_encryptor_manager.generate_token(
                    user_id, register_payload.password
                ),
            },
        )

    @route("PATCH", "/api/user")
    async def patch_user(self, request: CustomRequest) -> StreamResponse:
        old_token, (old_username, old_passhash_db) = (
            self.core.check_authorization_advanced(request)
        )
        update_user_payload = await parse_json_content(request, UpdateUserModel)
        if not old_token.is_correct_password(update_user_payload.password):
            raise CustomHTTPException.only_explain(
                HTTPStatus.FORBIDDEN, "Incorrect old password"
            )

        new_username = update_user_payload.new_username or old_username
        new_passhash_db = (
            old_passhash_db
            if update_user_payload.new_password is None
            else await gen_bcrypt(update_user_payload.new_password)
        )
        token_string, new_token = self.core.token_encryptor_manager.regenerate_token(
            old_token, update_user_payload.new_password
        )

        with self.core.db:
            try:
                self.core.db.execute(
                    "UPDATE users SET username=?, passhash=? WHERE id=?",
                    (new_username, new_passhash_db, old_token.user_id),
                )
            except sqlite3.IntegrityError:
                raise CustomHTTPException.only_explain(
                    HTTPStatus.CONFLICT, "The 'username' is already used"
                )
            if update_user_payload.new_password is not None:
                self.core.db.executemany(
                    "UPDATE sites SET name=?, secret=? WHERE id=?",
                    (
                        (
                            new_token.encrypt_string(
                                old_token.decrypt_string(encrypted_name)
                            ),
                            new_token.encrypt_string(
                                old_token.decrypt_string(encrypted_secret)
                            ),
                            site_id,
                        )
                        for site_id, encrypted_name, encrypted_secret in self.core.db.execute(
                            "SELECT id, name, secret FROM sites WHERE user=?",
                            (old_token.user_id,),
                        )
                    ),
                )

            self.core.token_encryptor_manager.invalidate_tokens_before(new_token)

        return make_json_response(
            HTTPStatus.OK, {"username": new_username, "token": token_string}
        )

    @route("DELETE", "/api/user")
    async def delete_user(self, request: CustomRequest) -> StreamResponse:
        token = self.core.check_authorization(request)
        delete_user_payload = await parse_json_content(request, DangerousActionModel)

        if not token.is_correct_password(delete_user_payload.password):
            raise CustomHTTPException.only_explain(
                HTTPStatus.FORBIDDEN, "Incorrect password"
            )

        with self.core.db:
            self.core.db.execute("DELETE FROM sites WHERE user=?", (token.user_id,))
            self.core.db.execute("DELETE FROM users WHERE id=?", (token.user_id,))
            self.core.token_encryptor_manager.cancel_tokens_expiration(token.user_id)

        return HTTPNoContent()


async def setup(modules_manager: ModulesManager):
    modules_manager.add_http_module(APIAuthenticationModule())
