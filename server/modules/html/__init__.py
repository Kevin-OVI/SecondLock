from __future__ import annotations

import copy
import os

from aiohttp import hdrs
from aiohttp.web import StreamResponse, FileResponse

from core_utilities import CustomRequest, HTTPStatus, CustomHTTPException
from decorators import route
from module_loader import HTTPModule, ModulesManager
from ..utils import translate_path, guess_type

DEFAULT_CSP = {
    "default-src": ["'self'", "data:"],
    "script-src": ["'self'", "'unsafe-inline'", "esm.run", "cdn.jsdelivr.net"],
    "style-src": ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
    "img-src": ["'self'", "data:"],
    "frame-src": ["'self'"],
    "connect-src": ["'self'"],
    "font-src": ["'self'", "fonts.gstatic.com"],
    "frame-ancestors": ["'self'"],
    "form-action": ["'self'"],
    "media-src": ["'self'"],
}


def create_headers(_: CustomRequest, content_type: str) -> dict[str, str]:
    res_headers = {hdrs.CONTENT_TYPE: content_type}

    csp = copy.deepcopy(DEFAULT_CSP)
    res_headers["Content-Security-Policy"] = "; ".join(
        f"{key} {' '.join(value)}" for key, value in csp.items()
    )
    res_headers[hdrs.CACHE_CONTROL] = "no-cache"
    res_headers["X-Content-Type-Options"] = "nosniff"

    return res_headers


class HTMLModule(HTTPModule):
    __slots__ = ()

    @route("GET", "/{t:(?!api(?:$|/)).*}")
    async def get_file(self, request: CustomRequest) -> StreamResponse:
        translated_path, is_dir = translate_path("../front/dist/", request)

        if is_dir:
            raise CustomHTTPException(HTTPStatus.NOT_FOUND, "File Not Found")

        if os.path.exists(translated_path):
            return FileResponse(
                path=translated_path,
                status=HTTPStatus.OK,
                headers=create_headers(request, guess_type(translated_path)),
            )
        else:
            raise CustomHTTPException(HTTPStatus.NOT_FOUND, "File Not Found")


async def setup(modules_manager: ModulesManager):
    modules_manager.add_http_module(HTMLModule())
