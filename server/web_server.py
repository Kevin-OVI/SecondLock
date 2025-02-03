import asyncio
import functools
import logging
import ssl
import traceback

from aiohttp import web_request, web_server, web, web_response, web_log, web_protocol
from aiohttp.web_request import BaseRequest
from aiohttp.web_response import StreamResponse

import module_loader
from core_utilities import CustomRequest, CustomHTTPException, HTTPStatus, AutoLogger

__all__ = ("WebApplication",)

CLIENT_MAX_SIZE = 8 * 1024**2


class WebAccessLogger(web_log.AccessLogger):
    LOG_FORMAT = '%a "%r" %s %b "%{Host}i" "%{User-Agent}i" %Dms'

    def __init__(self, logger: logging.Logger, log_format: str = LOG_FORMAT) -> None:
        super().__init__(logger, log_format)

    def compile_format(self, log_format: str) -> tuple[str, list[web_log.KeyMethod]]:
        # list of (key, method) tuples, we don't use an OrderedDict as users
        # can repeat the same key more than once
        methods = list()
        logger_class = type(self)

        for atom in self.FORMAT_RE.findall(log_format):
            if atom[1] == "":
                format_key1 = self.LOG_FORMAT_MAP[atom[0]]
                m = getattr(logger_class, "_format_%s" % atom[0])
                key_method = web_log.KeyMethod(format_key1, m)
            else:
                format_key2 = (self.LOG_FORMAT_MAP[atom[2]], atom[1])
                m = getattr(logger_class, "_format_%s" % atom[2])
                key_method = web_log.KeyMethod(
                    format_key2, functools.partial(m, atom[1])
                )

            methods.append(key_method)

        log_format = self.FORMAT_RE.sub(r"%s", log_format)
        log_format = self.CLEANUP_RE.sub(r"%\1", log_format)
        return log_format, methods

    @staticmethod
    def _format_D(request: BaseRequest, response: StreamResponse, time: float) -> str:
        return f"{time * 1000:.3f}"


class WebRequestHandler(web_protocol.RequestHandler):
    def log_access(
        self, request: CustomRequest, response: web_response.StreamResponse, time: float
    ) -> None:
        if request.log_request:
            super().log_access(request, response, time)


class WebApplication(web_server.Server, AutoLogger):
    def __init__(
        self,
        modules_manager: module_loader.ModulesManager,
        loop: asyncio.AbstractEventLoop,
    ):
        # noinspection PyTypeChecker
        super().__init__(self._handle, loop=loop)
        self.modules_manager = modules_manager

    def __call__(self) -> WebRequestHandler:
        return WebRequestHandler(
            self,
            loop=self._loop,
            access_log_class=WebAccessLogger,
            access_log_format=WebAccessLogger.LOG_FORMAT,
            max_line_size=16382,
        )

    async def _handle(self, request: CustomRequest) -> web_response.StreamResponse:
        await self.modules_manager.ready.wait()
        with self.modules_manager.requests_counter:
            request.site_host = self.modules_manager.special_module.get_sitehost(
                request
            )
            pre_handlers_stack: list[module_loader.PreHandlerModule] = []
            # noinspection PyBroadException
            try:
                for pre_handler in self.modules_manager.pre_handlers:
                    pre_handlers_stack.append(pre_handler)
                    response = await pre_handler.handle_request(request)
                    if response is not None:
                        break
                else:
                    response = await self.modules_manager.special_module.handle_request(
                        request
                    )
            except web.HTTPException as e:
                if e.status < 400:
                    response = e
                else:
                    response = await self.modules_manager.special_module.create_exception_response(
                        request,
                        CustomHTTPException(e.status, e.reason, e.text, e.headers),
                    )
            except CustomHTTPException as e:
                response = (
                    await self.modules_manager.special_module.create_exception_response(
                        request, e
                    )
                )
            except Exception:
                traceback.print_exc()
                response = (
                    await self.modules_manager.special_module.create_exception_response(
                        request, CustomHTTPException(HTTPStatus.INTERNAL_SERVER_ERROR)
                    )
                )

            for pre_handler in reversed(pre_handlers_stack):
                # noinspection PyBroadException
                try:
                    await pre_handler.handle_response(request, response)
                except Exception:
                    self.logger.error(
                        f"Error occured during execution of {pre_handler} handle_response method :\n{traceback.format_exc()}"
                    )
            return response

    def _make_request(
        self,
        message: web_request.RawRequestMessage,
        payload: web_request.StreamReader,
        protocol: web_protocol.RequestHandler,
        writer: web_request.AbstractStreamWriter,
        task: asyncio.Task[None],
    ) -> CustomRequest:
        return CustomRequest(
            self,
            message,
            payload,
            protocol,
            writer,
            task,
            self._loop,
            client_max_size=CLIENT_MAX_SIZE,
        )

    async def run(self, host: str, port: int, ssl_context: ssl.SSLContext | None):
        runner = web.ServerRunner(self)
        await runner.setup()
        address = f"{'http' if ssl_context is None else 'https'}://[{host}]:{port}/"
        site = web.TCPSite(runner, host, port, ssl_context=ssl_context)
        await site.start()
        print(f"======= Serving on {address} ======")
