import hashlib
import os
from typing import NoReturn

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

from core_utilities import CustomHTTPException, HTTPStatus

TOKEN_PREFIX = "2FA-"
TOKEN_FERNET = Fernet(Fernet.generate_key())


def generate_token(password: bytes) -> str:
    password_hash = hashlib.sha256(password).digest()
    return TOKEN_PREFIX + TOKEN_FERNET.encrypt(password_hash).rstrip(b"=").decode("ascii")


def raise_invalid_token() -> NoReturn:
    raise CustomHTTPException.only_explain(HTTPStatus.UNAUTHORIZED, "Invalid token")


def extract_token(token: str) -> bytes:
    if not token.startswith(TOKEN_PREFIX):
        raise_invalid_token()
    try:
        return TOKEN_FERNET.decrypt(token[len(TOKEN_PREFIX):])
    except (InvalidToken, UnicodeDecodeError):
        raise_invalid_token()


class SecretEncryptor:
    __slots__ = ("key",)

    def __init__(self, token: str) -> None:
        self.key = extract_token(token)

    def encrypt(self, plaintext: bytes):
        iv = os.urandom(16)

        cipher = Cipher(algorithms.AES(self.key), modes.GCM(iv), backend=default_backend())
        encryptor = cipher.encryptor()

        ciphertext = encryptor.update(plaintext) + encryptor.finalize()
        return iv + ciphertext + encryptor.tag

    def decrypt(self, ciphertext: bytes) -> bytes:
        iv = ciphertext[:16]
        tag = ciphertext[-16:]  # 16 derniers bytes en AES-GCM
        ciphertext = ciphertext[16:-16]

        cipher = Cipher(algorithms.AES(self.key), modes.GCM(iv, tag), backend=default_backend())
        decryptor = cipher.decryptor()

        return decryptor.update(ciphertext) + decryptor.finalize()

    def encrypt_string(self, plaintext: str) -> bytes:
        return self.encrypt(plaintext.encode("utf-8"))

    def decrypt_string(self, ciphertext: bytes) -> str:
        return self.decrypt(ciphertext).decode("utf-8")
