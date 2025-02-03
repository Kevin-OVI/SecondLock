from typing import Callable, Awaitable, TypeAlias

from core_utilities import CustomRequest
from module_loader import HTTPModule

__all__ = (
    "CHECK_RATELIMIT_PREDICATE",
    "CHECK_RATELIMIT_COUNTER",
    "CHECK_RATELIMIT_FUNCTIONS",
)

CHECK_RATELIMIT_PREDICATE: TypeAlias = Callable[
    [HTTPModule, CustomRequest], float | Awaitable[float]
]
CHECK_RATELIMIT_COUNTER: TypeAlias = Callable[
    [HTTPModule, CustomRequest], Awaitable[None] | None
]
CHECK_RATELIMIT_FUNCTIONS: TypeAlias = tuple[
    CHECK_RATELIMIT_PREDICATE, CHECK_RATELIMIT_COUNTER
]
