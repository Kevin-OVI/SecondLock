from __future__ import annotations

import asyncio
import math
from abc import ABC, abstractmethod
from typing import Callable, Collection

from aiohttp import web

from core_utilities import CustomRequest, CustomHTTPException, HTTPStatus
from module_loader import HTTPModule
from types_ import REQUEST_HANDLER_FUNC
from .types import CHECK_RATELIMIT_FUNCTIONS

__all__ = (
    "RateLimitCheckerBase",
    "RateLimitChecker",
    "RateLimitCheckerGroup",
    "RateLimitWrapper",
    "basic_ip_ratelimit",
    "check_ratelimit",
    "ip_lock",
)


class RateLimitCheckerBase(ABC):
    __slots__ = ()

    @abstractmethod
    async def check_ratelimit(self, module: HTTPModule, request: CustomRequest):
        pass

    @abstractmethod
    async def count_request(self, module: HTTPModule, request: CustomRequest):
        pass


class RateLimitChecker(RateLimitCheckerBase):
    __slots__ = ("_predicate", "_counter")

    def __init__(self, functions: CHECK_RATELIMIT_FUNCTIONS):
        self._predicate, self._counter = functions

    async def check_ratelimit(self, module: HTTPModule, request: CustomRequest):
        limit = self._predicate(module, request)
        if asyncio.iscoroutine(limit):
            limit = await limit
        if limit:
            raise CustomHTTPException(
                HTTPStatus.TOO_MANY_REQUESTS,
                headers={"Retry-After": f"{max(1, math.ceil(limit))}"},
            )

    async def count_request(self, module: HTTPModule, request: CustomRequest):
        self._counter(module, request)


class RateLimitCheckerGroup(RateLimitCheckerBase):
    __slots__ = ("_checkers",)

    def __init__(self, checkers: Collection[RateLimitCheckerBase]):
        self._checkers = checkers

    async def check_ratelimit(self, module: HTTPModule, request: CustomRequest):
        for checker in self._checkers:
            await checker.check_ratelimit(module, request)

    async def count_request(self, module: HTTPModule, request: CustomRequest):
        for checker in self._checkers:
            await checker.count_request(module, request)


class RateLimitWrapper:
    __slots__ = ("_owner", "_callback", "_checker", "__routes__", "__events__")

    def __init__(self, callback: REQUEST_HANDLER_FUNC, checker: RateLimitCheckerBase):
        self._owner = None
        self._callback = callback
        self._checker = checker

    def __get__(self, instance, owner):
        self._owner = instance
        return self

    async def __call__(self, request: CustomRequest) -> web.StreamResponse:
        await self._checker.check_ratelimit(self._owner, request)
        await self._checker.count_request(self._owner, request)
        return await self._callback(self._owner, request)

    def copy(self, func: REQUEST_HANDLER_FUNC) -> RateLimitWrapper:
        return RateLimitWrapper(func, self._checker)


def basic_ip_ratelimit(limit: int, reset: float) -> CHECK_RATELIMIT_FUNCTIONS:
    limits = {}

    def predicate(_: HTTPModule, request: CustomRequest) -> float:
        entry = limits.get(request.remote)
        loop = asyncio.get_running_loop()
        if entry is None:
            reset_at = loop.time() + reset
            calls = 1
        else:
            reset_at, calls = entry
            calls += 1
        request.attached.setdefault("ratelimits", {})[predicate] = (
            reset_at,
            calls,
            entry is None,
        )
        if calls > limit:
            return reset_at - loop.time()
        return 0

    def counter(_: HTTPModule, request: CustomRequest):
        reset_at, calls, first_call = request.attached["ratelimits"][predicate]
        loop = asyncio.get_running_loop()
        if first_call:
            loop.call_at(reset_at, limits.__delitem__, request.remote)
        limits[request.remote] = reset_at, calls

    return predicate, counter


def check_ratelimit(
    predicate: CHECK_RATELIMIT_FUNCTIONS,
) -> Callable[[REQUEST_HANDLER_FUNC], RateLimitWrapper]:
    def deco(func: REQUEST_HANDLER_FUNC) -> RateLimitWrapper:
        return RateLimitWrapper(func, RateLimitChecker(predicate))

    return deco


def ip_lock(func: REQUEST_HANDLER_FUNC) -> REQUEST_HANDLER_FUNC:
    locks: dict[str, tuple[asyncio.Lock, set[asyncio.Task]]] = {}

    async def locker(module: HTTPModule, request: CustomRequest) -> web.StreamResponse:
        current_task = asyncio.current_task()
        ip = request.remote
        if ip in locks:
            lock, awaiting_tasks = locks[ip]
            awaiting_tasks.add(current_task)
        else:
            lock = asyncio.Lock()
            awaiting_tasks = {current_task}
            locks[ip] = (lock, awaiting_tasks)

        await lock.acquire()
        try:
            return await func(module, request)
        finally:
            lock.release()
            awaiting_tasks.remove(current_task)
            if not awaiting_tasks:
                del locks[ip]

    return locker
