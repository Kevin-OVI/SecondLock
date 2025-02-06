from __future__ import annotations
from typing import Self
from core_utilities import CustomHTTPException

__all__ = ("JsonHttpException",)


class JsonHttpException(CustomHTTPException):
    def __init__(self, status, message=None, explain=None, headers=None):
        super().__init__(status, message, explain, headers)
        self.headers["Content-Type"] = "application/json"
        self.additional_properties = {}

    def add_property(self, key: str, value) -> Self:
        self.additional_properties[key] = value
        return self
