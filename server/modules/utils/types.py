from typing import Callable, Awaitable

from core_utilities import CustomRequest
from module_loader import HTTPModule

__all__ = ("CHECK_RATELIMIT_PREDICATE",)

CHECK_RATELIMIT_PREDICATE = Callable[[HTTPModule, CustomRequest], float | Awaitable[float]]
