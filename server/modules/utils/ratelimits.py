from __future__ import annotations

import asyncio
import math
from typing import Callable

from aiohttp import web

from core_utilities import CustomRequest, CustomHTTPException, HTTPStatus
from module_loader import HTTPModule
from types_ import REQUEST_HANDLER_FUNC
from .types import CHECK_RATELIMIT_PREDICATE

__all__ = ("RateLimitCheckerServer", "basic_ip_ratelimit", "check_ratelimit")


class RateLimitCheckerServer:
    __slots__ = ("_owner", "_callback", "_predicate", "__routes__", "__events__")

    def __init__(self, callback: REQUEST_HANDLER_FUNC, predicate: CHECK_RATELIMIT_PREDICATE):
        self._owner = None
        self._callback = callback
        self._predicate = predicate

    def __get__(self, instance, owner):
        self._owner = instance
        return self

    async def __call__(self, request: CustomRequest) -> web.StreamResponse:
        limit = self._predicate(self._owner, request)
        if asyncio.iscoroutine(limit):
            limit = await limit
        if limit:
            raise CustomHTTPException(HTTPStatus.TOO_MANY_REQUESTS, headers={"Retry-After": f"{max(1, math.ceil(limit))}"})
        return await self._callback(self._owner, request)

    def same_ratelimit(self, func: REQUEST_HANDLER_FUNC) -> RateLimitCheckerServer:
        return RateLimitCheckerServer(func, self._predicate)


def basic_ip_ratelimit(limit: int, reset: float) -> CHECK_RATELIMIT_PREDICATE:
    limits = {}

    def predicate(_: HTTPModule, request: CustomRequest) -> float:
        entry = limits.get(request.remote)
        loop = asyncio.get_running_loop()
        if entry is None:
            reset_at = loop.time() + reset
            loop.call_at(reset_at, limits.__delitem__, request.remote)
            calls = 1
        else:
            reset_at, calls = entry
            calls += 1
        limits[request.remote] = reset_at, calls
        if calls > limit:
            return reset_at - loop.time()
        return 0

    return predicate


def check_ratelimit(predicate: CHECK_RATELIMIT_PREDICATE) -> Callable[[REQUEST_HANDLER_FUNC], RateLimitCheckerServer]:
    def deco(func: REQUEST_HANDLER_FUNC) -> RateLimitCheckerServer:
        return RateLimitCheckerServer(func, predicate)

    return deco
