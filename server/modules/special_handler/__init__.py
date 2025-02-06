import os
from typing import Callable, Sequence, Awaitable, Any

from aiofiles import open as aopen
from aiohttp import web, web_urldispatcher, hdrs

from config import DOMAINS, DEV_ENV
from decorators import route
from core_utilities import (
    SiteHost,
    CustomRequest,
    CustomHTTPException,
    silent_delitem,
    HTTPStatus,
)
from module_loader import ModulesManager, SpecialModule, HTTPModule, PreHandlerModule
from ..utils import (
    is_api_path,
    JsonHttpException,
    json_compact_dumps,
)

SITEHOST_MAIN = SiteHost(*DOMAINS)


class SpecialHandlerModule(SpecialModule):
    __slots__ = ("routers",)

    def __init__(self):
        self.routers: dict[SiteHost, web_urldispatcher.UrlDispatcher] = {}

    def on_add_http_routes(
        self,
        attr: str,
        value: Callable[[CustomRequest], Awaitable[web.StreamResponse]],
        routes: list[tuple[Sequence[str], str]],
        extras: dict[str, Any],
    ):
        site_host: SiteHost = extras.get("site_host", SITEHOST_MAIN)
        router = self.routers.get(site_host)
        if router is None:
            router = self.routers[site_host] = web_urldispatcher.UrlDispatcher()

        for route_key in routes:
            methods, path = route_key
            for method in methods:
                # noinspection PyTypeChecker
                router.add_route(method, path, value)

    def get_sitehost(self, request: CustomRequest) -> SiteHost | None:
        host = request.host_without_port.lower()
        for site_host in self.routers:
            if site_host.has_host(host):
                return site_host
        return None

    async def create_exception_response(
        self, request: CustomRequest, http_exception: CustomHTTPException
    ) -> web.StreamResponse:
        if is_api_path(request.path):
            data = {
                "code": http_exception.status,
                "message": http_exception.message,
                "explain": http_exception.explain,
            }
            if isinstance(http_exception, JsonHttpException):
                data.update(http_exception.additional_properties)
            body = json_compact_dumps(data).encode("utf-8")
            content_type = "application/json"
        else:
            error_format = "main_site.html"
            content_type = "text/html"
            async with aopen(
                os.path.join("../templates/errors", error_format), "r", encoding="utf-8"
            ) as f:
                body = (await f.read()) % {
                    "code": http_exception.status,
                    "message": http_exception.message,
                    "explain": http_exception.explain,
                }

        if http_exception.headers is not None:
            silent_delitem(http_exception.headers, hdrs.CONTENT_TYPE)

        return web.Response(
            status=http_exception.status,
            reason=http_exception.message,
            content_type=content_type,
            headers=http_exception.headers,
            charset="utf-8",
            body=body,
        )

    def get_router(self, request: CustomRequest):
        if request.site_host is None:
            raise KeyError
        return self.routers[request.site_host]

    async def handle_request(self, request: CustomRequest) -> web.StreamResponse:
        try:
            router = self.get_router(request)
        except KeyError:
            raise CustomHTTPException(HTTPStatus.NOT_FOUND) from None

        match_info = await router.resolve(request)
        match_info.freeze()

        resp = None
        request._match_info = match_info
        expect = request.headers.get(hdrs.EXPECT)
        if expect:
            resp = await match_info.expect_handler(request)
            await request.writer.drain()

        if resp is None:
            resp = await match_info.handler(request)

        return resp


class SpecialPreHandlerModule(PreHandlerModule):
    async def handle_response(
        self, request: CustomRequest, response: web.StreamResponse
    ) -> None:
        if DEV_ENV:
            response.headers["Access-Control-Allow-Origin"] = "*"


class SpecialHTTPModule(HTTPModule):
    __slots__ = ()

    if DEV_ENV:

        @route("OPTIONS", "/api/{t:.*}")
        async def options_all(self, request):
            return web.HTTPNoContent(
                headers={
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                }
            )


async def setup(module_manager: ModulesManager):
    module_manager.set_special_module(SpecialHandlerModule())
    module_manager.add_prehandler_module(SpecialPreHandlerModule())
    module_manager.add_http_module(SpecialHTTPModule())
