from typing import Callable, Awaitable

from aiohttp import web_response

from core_utilities import CustomRequest
from module_loader import HTTPModule

REQUEST_HANDLER_FUNC = Callable[
    [HTTPModule, CustomRequest], Awaitable[web_response.StreamResponse]
]
REQUEST_HANDLER_DECO = Callable[[REQUEST_HANDLER_FUNC], REQUEST_HANDLER_FUNC]
