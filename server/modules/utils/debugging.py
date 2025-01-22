from __future__ import annotations

import time
from typing import Callable, Any, TypeVar, Awaitable

FUNC = TypeVar("FUNC", bound=Callable[..., Any])
ASYNC_FUNC = TypeVar("ASYNC_FUNC", bound=Callable[..., Awaitable[Any]])


def time_function(func: FUNC) -> FUNC:
    def timer(*args, **kwargs):
        start = time.perf_counter_ns()
        try:
            return func(*args, **kwargs)
        finally:
            stop = time.perf_counter_ns()
            print(f"{func} took {(stop - start) / 1_000_000:.0f}ms")

    return timer


def time_async_function(func: ASYNC_FUNC) -> ASYNC_FUNC:
    async def timer(*args, **kwargs):
        start = time.perf_counter_ns()
        try:
            return await func(*args, **kwargs)
        finally:
            stop = time.perf_counter_ns()
            print(f"{func} took {(stop - start) / 1_000_000:.0f}ms")

    return timer
