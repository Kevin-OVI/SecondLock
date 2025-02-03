from __future__ import annotations

from typing import Sequence, TypeVar, Callable, TypeAlias

from aiohttp import web_request, web_response

__all__ = ("route", "event")

_REQUEST_HANDLER: TypeAlias = Callable[[web_request.Request], web_response.Response]


def route(methods: str | Sequence[str], path: str):
    if isinstance(methods, str):
        methods = (methods,)

    def deco(func: _REQUEST_HANDLER) -> _REQUEST_HANDLER:
        if hasattr(func, "__routes__"):
            func.__routes__.append((methods, path))
        else:
            func.__routes__ = [(methods, path)]
        return func

    return deco


def event(event_name: str, priority: int = 0):
    _FUNC = TypeVar("_FUNC")

    def deco(func: _FUNC) -> _FUNC:
        if hasattr(func, "__events__"):
            already_registered = func.__events__.get(event_name)
            if already_registered is not None:
                raise ValueError(
                    f"event {event_name} is already registered on function {func} with priority {already_registered}"
                )
            func.__events__[event_name] = priority
        else:
            func.__events__ = {event_name: priority}

        return func

    return deco
