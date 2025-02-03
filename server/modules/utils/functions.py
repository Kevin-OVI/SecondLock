from __future__ import annotations

import asyncio
import json
import mimetypes
import os
import posixpath
from typing import Any, Type

from aiohttp import web_response, web, StreamReader

from core_utilities import CustomRequest, CustomHTTPException, HTTPStatus

__all__ = (
    "make_json_response",
    "load_json_request",
    "verify_content",
    "guess_type",
    "read_max",
    "translate_path",
    "is_api_path",
    "url_match",
    "json_compact_dumps",
    "fix_base64_padding",
)


def json_compact_dumps(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, separators=(",", ":"))


async def load_json_request(request: CustomRequest) -> Any:
    if request.content_type != "application/json":
        raise CustomHTTPException.only_explain(
            HTTPStatus.EXPECTATION_FAILED, "JSON content type expected"
        )
    try:
        return json.loads(await request.text())
    except json.JSONDecodeError:
        raise CustomHTTPException.only_explain(HTTPStatus.BAD_REQUEST, "Bad JSON")


def make_json_response(status: int, data: Any) -> web_response.StreamResponse:
    return web.Response(
        status=status,
        content_type="application/json",
        charset="utf-8",
        body=json_compact_dumps(data).encode("utf-8"),
    )


def verify_content(
    value: Any,
    error_missing: str,
    expected_type: Type = None,
    error_invalid_type: str = None,
):
    if value is None:
        raise CustomHTTPException.only_explain(HTTPStatus.BAD_REQUEST, error_missing)
    if expected_type is not None and not isinstance(value, expected_type):
        raise CustomHTTPException.only_explain(
            HTTPStatus.BAD_REQUEST, error_invalid_type
        )


def guess_type(path):
    base, ext = posixpath.splitext(path)
    if ext in _extensions_map:
        return _extensions_map[ext]
    ext = ext.lower()
    if ext in _extensions_map:
        return _extensions_map[ext]
    else:
        return _extensions_map[""]


def relative_path_walk(
    real_path: str, *, relative_path: str = "", relative_path_separator: str = "/"
):
    stack = [(real_path, relative_path)]
    while stack:
        real_path, relative_path = stack.pop()
        for item in os.listdir(real_path):
            real_item_path = os.path.join(real_path, item)
            relative_item_path = f"{relative_path}{relative_path_separator}{item}"
            if os.path.isfile(real_item_path):
                yield real_item_path, relative_item_path
            else:
                stack.append((real_item_path, relative_item_path))


async def read_max(stream: StreamReader, n: int):
    try:
        return await stream.readexactly(n)
    except asyncio.IncompleteReadError as e:
        return e.partial


if not mimetypes.inited:
    mimetypes.init()  # try to read system mime.types
_extensions_map = mimetypes.types_map.copy()
_extensions_map.update(
    {
        "": "application/octet-stream",  # Default
        ".py": "text/plain",
        ".c": "text/plain",
        ".h": "text/plain",
        ".js": "text/javascript",
    }
)


def translate_path(
    base_path: str,
    request: CustomRequest,
    append_index_html: bool = True,
    path_prefix: str = None,
) -> tuple[str, bool]:
    # Don't forget explicit trailing slash when normalizing. Issue17324
    path = request.path
    if path_prefix is not None:
        if path.startswith(path_prefix):
            path = path[len(path_prefix) :]
        else:
            raise CustomHTTPException(HTTPStatus.NOT_FOUND)

    trailing_slash = path.rstrip().endswith("/")
    words = filter(None, posixpath.normpath(path).split("/"))
    translated_path = base_path
    for word in words:
        word: str
        if os.path.dirname(word) or word in (os.curdir, os.pardir):
            # Ignore components that are not a simple file/directory name
            continue
        translated_path = os.path.join(translated_path, word)

    if os.path.isdir(translated_path):
        if trailing_slash:
            is_dir = True
            translated_path += "/"
            if append_index_html:
                for item in os.listdir(translated_path):
                    if item in ("index.html", "index.htm"):
                        translated_path += item
                        is_dir = False
                        break
        else:
            new_path = request.path + "/"
            if request.query_string:
                new_path += "?" + request.query_string
            raise web.HTTPPermanentRedirect(new_path)
    else:
        is_dir = False
        if trailing_slash:
            translated_path += "/"

    return translated_path, is_dir


def is_api_path(path: str) -> bool:
    return url_match(path, "/api/*")  # or url_match(path, "/nitro_behavior/api/*")


def url_match(path, match):
    if match.endswith("/*"):
        return path == match[:-2] or path.startswith(match[:-1])
    if match.endswith("/"):
        return path == match or path == match[:-1]
    if match.endswith("*"):
        return path.startswith(match[:-1])

    if match.startswith("*/"):
        return path == match[2:] or path.endswith(match[1:])
    if match.startswith("*"):
        return path.endswith(match[1:])

    return path == match


def fix_base64_padding(s: str) -> str:
    correct_padding = len(s) % 4
    if correct_padding > 0:
        correct_padding = 4 - correct_padding
    return s + "=" * correct_padding
