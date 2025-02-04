import os
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes


class Encryptor:
    __slots__ = ("_key",)

    def __init__(self, key: bytes):
        self._key = key

    def encrypt(self, plaintext: bytes):
        iv = os.urandom(16)

        cipher = Cipher(
            algorithms.AES(self._key), modes.GCM(iv), backend=default_backend()
        )
        encryptor = cipher.encryptor()

        ciphertext = encryptor.update(plaintext) + encryptor.finalize()
        return iv + ciphertext + encryptor.tag

    def decrypt(self, ciphertext: bytes) -> bytes:
        iv = ciphertext[:16]
        tag = ciphertext[-16:]  # 16 derniers bytes en AES-GCM
        ciphertext = ciphertext[16:-16]

        cipher = Cipher(
            algorithms.AES(self._key), modes.GCM(iv, tag), backend=default_backend()
        )
        decryptor = cipher.decryptor()

        return decryptor.update(ciphertext) + decryptor.finalize()

    def encrypt_string(self, plaintext: str) -> bytes:
        return self.encrypt(plaintext.encode("utf-8"))

    def decrypt_string(self, ciphertext: bytes) -> str:
        return self.decrypt(ciphertext).decode("utf-8")
