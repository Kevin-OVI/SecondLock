from __future__ import annotations

import asyncio
import base64
import hashlib
import math
import struct
import time
from typing import NoReturn

import bcrypt
from aiohttp import hdrs
from cryptography.fernet import Fernet, InvalidToken

from core_utilities import CustomHTTPException, HTTPStatus, CustomRequest
from modules.utils import fix_base64_padding, NS_MULTIPLIER
from ..utils.encryption import Encryptor

__all__ = (
    "DUMMY_HASH",
    "gen_bcrypt",
    "check_bcrypt",
    "raise_invalid_token",
    "TokenEncryptorManager",
    "Token",
    "hash_password",
)

DUMMY_HASH = bcrypt.hashpw(b"", bcrypt.gensalt())


async def gen_bcrypt(passhash: bytes, rounds: int = 12, prefix: bytes = b"2b") -> bytes:
    run_in_executor = asyncio.get_running_loop().run_in_executor
    return await run_in_executor(
        None,
        bcrypt.hashpw,
        passhash,
        await run_in_executor(None, bcrypt.gensalt, rounds, prefix),
    )


async def check_bcrypt(passhash: bytes, passhash_db: bytes) -> bool:
    return await asyncio.get_running_loop().run_in_executor(
        None, bcrypt.checkpw, passhash, passhash_db
    )


def raise_invalid_token() -> NoReturn:
    raise CustomHTTPException.only_explain(HTTPStatus.UNAUTHORIZED, "Invalid token")


def hash_password(password: bytes) -> bytes:
    return hashlib.sha256(password).digest()


class TokenEncryptorManager:
    __slots__ = (
        "_token_validity_time_ns",
        "_token_prefix",
        "_last_rotate",
        "_rotate_delay",
        "_expiry_delay",
        "_encryptors",
        "_expire_tasks",
        "_current_index",
        "_user_token_expirations",
    )

    def __init__(self, token_validity_time: int, n_encryptors: int, token_prefix: str):
        self._token_validity_time_ns = token_validity_time * NS_MULTIPLIER
        self._token_prefix = token_prefix
        self._last_rotate = 0
        self._rotate_delay = token_validity_time / (n_encryptors - 1)
        self._expiry_delay = token_validity_time + self._rotate_delay

        self._encryptors: list[tuple[TokenEncryptor, asyncio.Task] | None] = [
            None
        ] * n_encryptors
        self._current_index = -1

        self._user_token_expirations: dict[int, tuple[int, asyncio.Task]] = {}

    async def _expire_encryptor(self, index: int):
        await asyncio.sleep(self._expiry_delay)
        if (encryptor_group := self._encryptors[index]) is not None and encryptor_group[
            1
        ] is asyncio.current_task():
            self._encryptors[index] = None

    def _generate_token(self, user_id: int, passhash: bytes) -> tuple[str, Token]:
        if (t := time.time()) - self._last_rotate > self._rotate_delay:
            self._current_index = (self._current_index + 1) % len(self._encryptors)
            encryptor = TokenEncryptor(self._token_validity_time_ns)
            prev = self._encryptors[self._current_index]
            if prev is not None:
                prev[1].cancel()
            self._encryptors[self._current_index] = (
                encryptor,
                asyncio.create_task(self._expire_encryptor(self._current_index)),
            )
            self._last_rotate = t
        else:
            encryptor = self._encryptors[self._current_index][0]

        index_bytes = self._current_index.to_bytes(
            math.ceil((len(self._encryptors) - 1).bit_length() / 8), "big", signed=False
        )
        b64_index = base64.b64encode(index_bytes).rstrip(b"=").decode("ascii")
        encrypted, token = encryptor.encrypt(user_id, passhash)

        return f"{self._token_prefix}.{b64_index}.{encrypted}", token

    def generate_token(self, user_id: int, password: bytes) -> str:
        return self._generate_token(user_id, hash_password(password))[0]

    def regenerate_token(
        self, old_token: Token, password: bytes | None
    ) -> tuple[str, Token]:
        if password is None:
            return self._generate_token(old_token.user_id, old_token._key)
        return self._generate_token(old_token.user_id, hash_password(password))

    def get_token(self, request: CustomRequest) -> Token:
        token: str = request.headers.get(hdrs.AUTHORIZATION)
        prefix_part = f"{self._token_prefix}."
        if token is None or not token.startswith(prefix_part):
            raise_invalid_token()

        token = token[len(prefix_part) :]
        parts = token.split(".")
        if len(parts) != 2:
            raise_invalid_token()

        b64_index, encrypted = parts
        index = int.from_bytes(
            base64.b64decode(fix_base64_padding(b64_index)), "big", signed=False
        )
        if index >= len(self._encryptors):
            raise_invalid_token()

        encryptor_group = self._encryptors[index]
        if encryptor_group is None:
            raise_invalid_token()

        decrypted_token = encryptor_group[0].decrypt(encrypted)

        if (
            user_expiration := self._user_token_expirations.get(decrypted_token.user_id)
        ) is not None and user_expiration[0] > decrypted_token.creation_timestamp:
            raise_invalid_token()

        return decrypted_token

    def invalidate_tokens_before(self, token: Token):
        user_id = token.user_id
        creation_timestamp = token.creation_timestamp
        expiry_timestamp = token.expiry_timestamp

        try:
            old_timestamp, old_task = self._user_token_expirations[user_id]
        except KeyError:
            pass
        else:
            if old_timestamp > creation_timestamp:
                return
            old_task.cancel()

        async def expire():
            await asyncio.sleep((expiry_timestamp - time.time_ns()) / NS_MULTIPLIER)
            del self._user_token_expirations[user_id]

        self._user_token_expirations[user_id] = (
            creation_timestamp,
            asyncio.create_task(expire()),
        )

    def cancel_tokens_expiration(self, user_id: int):
        try:
            _, task = self._user_token_expirations.pop(user_id)
        except KeyError:
            pass
        else:
            task.cancel()


class TokenEncryptor:
    TOKEN_STRUCT_FORMAT = ">QI32s"  # 32 octets dans le hash pour sha256

    __slots__ = ("_token_validity_time_ns", "_fernet")

    def __init__(self, token_validity_time_ns: int):
        self._token_validity_time_ns = token_validity_time_ns
        self._fernet = Fernet(Fernet.generate_key())

    def encrypt(self, user_id: int, passhash: bytes) -> tuple[str, Token]:
        token_creation_timestamp = time.time_ns()
        token = Token(
            user_id,
            passhash,
            token_creation_timestamp,
            token_creation_timestamp + self._token_validity_time_ns,
        )
        packed = struct.pack(
            self.TOKEN_STRUCT_FORMAT, token_creation_timestamp, user_id, passhash
        )
        return self._fernet.encrypt(packed).rstrip(b"=").decode("ascii"), token

    def decrypt(self, encrypted: str) -> Token:
        try:
            decrypted = self._fernet.decrypt(encrypted)
        except (InvalidToken, UnicodeDecodeError):
            raise_invalid_token()

        token_creation_timestamp, user_id, key = struct.unpack(
            self.TOKEN_STRUCT_FORMAT, decrypted
        )
        token_expiration_timestamp = (
            token_creation_timestamp + self._token_validity_time_ns
        )
        now = time.time_ns()
        if now > token_expiration_timestamp:
            raise_invalid_token()

        return Token(user_id, key, token_creation_timestamp, token_expiration_timestamp)


class Token(Encryptor):
    __slots__ = ("user_id", "value", "creation_timestamp", "expiry_timestamp")

    def __init__(
        self, user_id: int, key: bytes, creation_timestamp: int, expiry_timestamp: int
    ):
        super().__init__(key)
        self.user_id = user_id
        self.creation_timestamp = creation_timestamp
        self.expiry_timestamp = expiry_timestamp

    def is_correct_password(self, password: bytes):
        return hash_password(password) == self._key
