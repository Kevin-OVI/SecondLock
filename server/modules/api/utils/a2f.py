import binascii
import time

import pyotp

from core_utilities import HTTPStatus, CustomHTTPException


def generate_code(secret: str) -> str:
    try:
        return pyotp.TOTP(secret).now()
    except binascii.Error:
        raise CustomHTTPException.only_explain(HTTPStatus.UNPROCESSABLE_ENTITY, "Invalid 'secret'")


def next_timecode_in() -> float:
    return 30 - (time.time() % 30)
