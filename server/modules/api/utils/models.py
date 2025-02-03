from typing import Annotated

from pydantic import BaseModel, Field, BeforeValidator

__all__ = (
    "LoginRegisterModel",
    "UpdateSiteModel",
    "CreateSiteModel",
    "DangerousActionModel",
    "UpdateUserModel",
)


def _convert_password(s: str) -> bytes:
    assert isinstance(s, str), "Input should be a valid string"
    return s.encode("utf-8")


Username = Annotated[str, Field(pattern=r"[a-z0-9\-_]{4,16}")]
Password = Annotated[bytes, BeforeValidator(_convert_password, str)]
SiteName = Annotated[str, Field(max_length=64)]


class LoginRegisterModel(BaseModel):
    username: Username
    password: Password


class UpdateSiteModel(BaseModel):
    name: SiteName


class CreateSiteModel(UpdateSiteModel):
    secret: str


class DangerousActionModel(BaseModel):
    password: Password


class UpdateUserModel(DangerousActionModel):
    new_username: Username = None
    new_password: Password = None
