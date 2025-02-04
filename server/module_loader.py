from __future__ import annotations

import abc
import asyncio
import functools
import importlib
import json
import logging
import os
import pathlib
import sys
import traceback
from types import ModuleType
from typing import (
    Any,
    Awaitable,
    Callable,
    Coroutine,
    Reversible,
    Sequence,
    TYPE_CHECKING,
    TypeVar,
)

from aiohttp import web

from core_utilities import AutoLogger, Counter, SiteHost, frozen_partial
from core_utilities.functions import ainput

MODULES_DIR = "modules"
CONFIG_FILE_NAME = "config.json"

if TYPE_CHECKING:
    from core_utilities.http import CustomRequest, CustomHTTPException


def load_config(config_file) -> dict:
    if os.path.exists(config_file):
        with open(config_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def scan_modules() -> list[str]:
    by_dependencies: dict[str, set[str]] = {}

    main_config = load_config(os.path.join(MODULES_DIR, CONFIG_FILE_NAME))
    ignore = set(main_config.get("ignore", []))

    stack: list[pathlib.Path] = [pathlib.Path(MODULES_DIR)]

    while stack:
        current_dir = stack.pop()
        for item in os.listdir(current_dir):
            if item == "__pycache__":
                continue

            item_path = current_dir.joinpath(item)
            item_id = item_path.relative_to(MODULES_DIR).as_posix().replace("/", ".")
            if item_id in ignore or not item_path.is_dir():
                continue

            if item_path.joinpath("__init__.py").exists():
                config = load_config(item_path.joinpath(CONFIG_FILE_NAME))
                dependencies = config.get("dependencies")
                if dependencies:
                    deps = set(dependencies)
                else:
                    deps = set()

                for scanned_module in by_dependencies:
                    if item_id.startswith(scanned_module):
                        deps.add(scanned_module)

                by_dependencies[item_id] = deps

                scan_subdirs: list[str] | None = config.get("load_subdirectories", None)
                if scan_subdirs:
                    stack.extend(
                        item_path.joinpath(subdir) for subdir in set(scan_subdirs)
                    )
            else:
                stack.append(item_path)

    flattened_list = []

    while by_dependencies:
        loaded_from_pass = []
        for module, dependencies in by_dependencies.items():
            if not dependencies:
                loaded_from_pass.append(module)
                for _, deps in by_dependencies.items():
                    deps.discard(module)
        if loaded_from_pass:
            flattened_list.extend(loaded_from_pass)
            for module in loaded_from_pass:
                del by_dependencies[module]
        else:
            raise RuntimeError(f"Circular dependencies detected : {by_dependencies}")

    return flattened_list


class ModulesManager(AutoLogger):
    __slots__ = (
        "ready",
        "requests_counter",
        "libs",
        "events",
        "pre_handlers",
        "modules",
        "_special_module",
    )

    if TYPE_CHECKING:
        libs: list[tuple[str, ModuleType]]

    def __init__(self):
        self.ready = asyncio.Event()
        self.requests_counter = Counter()
        self.events: dict[str, dict[int, list[Callable[..., Coroutine]]]] = {}
        self.pre_handlers: list[PreHandlerModule] = []
        self.modules: list[BaseModule] = []
        self._special_module: SpecialModule | None = None

        ModuleStorage.modules_manager = self
        self.logger.setLevel(logging.DEBUG)

    def _import_libs(self):
        self.libs = []
        for name in scan_modules():
            self.libs.append((name, importlib.import_module(f"{MODULES_DIR}.{name}")))

    async def _initialise_modules(self):
        exceptions: list[Exception] = []
        for name, module in self.libs:
            try:
                await module.setup(self)
            except Exception as e:
                exceptions.append(e)
            else:
                self.logger.debug(f"Loaded {name}")
        if exceptions:
            raise ExceptionGroup(
                "Exception(s) occured during initialising modules", exceptions
            )
        if self._special_module is None:
            raise RuntimeError("No special module loaded")

    def _clear_data(self):
        self.modules.clear()
        self.pre_handlers.clear()
        self.events.clear()
        self._special_module = None

    async def load_modules(self):
        self._import_libs()
        await self._initialise_modules()

    def _try_add_routes(self, extras: dict[str, Any], attr: str, value):
        routes: list[tuple[Sequence[str], str]] | None = getattr(
            value, "__routes__", None
        )
        if routes is None:
            return

        self.special_module.on_add_http_routes(attr, value, routes, extras)

    def _try_register_events(self, value):
        events: dict[str, int] | None = getattr(value, "__events__", None)
        if events is None:
            return

        for event_name, priority in events.items():
            self.events.setdefault(event_name, {}).setdefault(priority, []).append(
                value
            )

    async def dispatch_event(self, event_name: str, *args, **kwargs):
        functions_by_priority = self.events.get(event_name, None)
        if functions_by_priority is None:
            return
        for _, function_list in sorted(
            functions_by_priority.items(), key=lambda x: x[0]
        ):
            # noinspection PyBroadException
            try:
                async with asyncio.TaskGroup() as tg:
                    for function in function_list:
                        tg.create_task(function(*args, **kwargs))
            except ExceptionGroup:
                traceback.print_exc()

    async def _call_unload(self, modules: Reversible[BaseModule]):
        try:
            async with asyncio.TaskGroup() as tg:
                for module in reversed(modules):
                    tg.create_task(module.on_unload()).add_done_callback(
                        frozen_partial(
                            self.logger.debug,
                            "Unloaded %s",
                            f"{module.__module__}.{module.__class__.__name__}",
                        )
                    )
        except ExceptionGroup:
            traceback.print_exc()

    async def unload(self):
        self.ready.clear()
        await self.dispatch_event("disconnect_websocket")
        await self.requests_counter.wait()
        await self._call_unload(self.modules)

    async def _reload(self):
        self.ready.clear()
        await self.dispatch_event("disconnect_websocket")
        await self.requests_counter.wait()

        self.logger.debug("Saving state...")
        old_sys_modules = sys.modules.copy()
        old_libs = self.libs

        self.logger.debug("Unloading old modules")
        await self._call_unload(self.modules)

        self.logger.debug("Removing modules data...")
        self._clear_data()

        remove = []
        for module in sys.modules:
            if module.startswith("modules."):
                remove.append(module)
        for module in remove:
            self.logger.debug(f"Removing sys.modules {module}...")
            del sys.modules[module]

        self.logger.debug("Loading new versions...")
        # noinspection PyBroadException
        try:
            await self.load_modules()
        except Exception as e:
            self.logger.exception(
                f"Error occured, unloading partially loaded modules and restoring saved data...",
                exc_info=e,
            )
            await self._call_unload(self.modules)
            self._clear_data()
            remove = []
            for module in sys.modules:
                if module not in old_sys_modules:
                    remove.append(module)
            for module in remove:
                del sys.modules[module]
            sys.modules.update(old_sys_modules)

            self.libs = old_libs
            try:
                await self._initialise_modules()
            except Exception as e:
                self.logger.critical(
                    "Error occured whilst re-initializing old librairies, server might be in a very broken state.",
                    exc_info=e,
                )
                self.logger.critical("Continue running ? (y/N)")
                while True:
                    inp = (await ainput("> ")).strip().upper()
                    if inp == "Y":
                        break
                    if inp == "N" or not inp:
                        from aiohttp.web_runner import GracefulExit

                        raise GracefulExit from None
                    self.logger.critical("Unknown option. Choose Yes (Y) or No (N)")
            else:
                self.logger.error("Old modules re-initialized successfully.")
        else:
            self.logger.debug("New modules loaded, operation completed successfully")

        self.ready.set()

    def reload(self):
        asyncio.create_task(self._reload())

    def add_module_base(
        self, module: BaseModule, *attribute_registerers: Callable[[str, Any], Any]
    ):
        self.modules.append(module)
        module_class = type(module)
        for attr in dir(module_class):
            value = getattr(module, attr, None)
            if value is not None:
                for function in attribute_registerers:
                    function(attr, value)
                self._try_register_events(value)

    def add_http_module(self, module: HTTPModule, **extra):
        self.add_module_base(module, functools.partial(self._try_add_routes, extra))

    def add_prehandler_module(self, module: PreHandlerModule, before: str = None):
        self.add_module_base(module)
        if before is not None:
            insert_at = None
            for index, pre_handler in enumerate(self.pre_handlers):
                if pre_handler.__class__.__name__ == before:
                    insert_at = index
                    break
            if insert_at is not None:
                self.pre_handlers.insert(insert_at, module)
                return
        self.pre_handlers.append(module)

    def set_special_module(self, module: SpecialModule):
        self.add_module_base(module)
        if self._special_module is None:
            self._special_module = module
        else:
            raise RuntimeError(f"Special module already set to {self._special_module}")

    @property
    def special_module(self) -> SpecialModule:
        if self._special_module is None:
            raise RuntimeError("No special module")
        return self._special_module

    def get_module(self, module_class: type[T]) -> T:
        for module in self.modules:
            if isinstance(module, module_class):
                return module
        raise ValueError(f"No module of type {module_class.__name__} found")


class ModuleStorage(AutoLogger):
    __slots__ = ()

    modules_manager: ModulesManager
    tasks = set()

    @classmethod
    @functools.wraps(asyncio.create_task)
    def create_task(cls, *args, **kwargs):
        task = asyncio.create_task(*args, **kwargs)
        cls.tasks.add(task)
        task.add_done_callback(cls.tasks.discard)
        return task


class BaseModule(ModuleStorage):
    __slots__ = ()

    async def on_unload(self):
        pass


class HTTPModule(BaseModule):
    __slots__ = ()


class PreHandlerModule(BaseModule):
    __slots__ = ()

    async def handle_request(self, request: CustomRequest) -> web.StreamResponse | None:
        pass

    async def handle_response(
        self, request: CustomRequest, response: web.StreamResponse
    ) -> None:
        pass


class SpecialModule(BaseModule, abc.ABC):
    __slots__ = ()

    @abc.abstractmethod
    def on_add_http_routes(
        self,
        attr: str,
        value: Callable[[CustomRequest], Awaitable[web.StreamResponse]],
        routes: list[tuple[Sequence[str], str]],
        extras: dict[str, Any],
    ):
        pass

    @abc.abstractmethod
    def get_sitehost(self, request: CustomRequest) -> SiteHost | None:
        pass

    @abc.abstractmethod
    async def create_exception_response(
        self, request: CustomRequest, http_exception: CustomHTTPException
    ) -> web.StreamResponse:
        pass

    @abc.abstractmethod
    async def handle_request(self, request: CustomRequest) -> web.StreamResponse:
        pass


T = TypeVar("T", bound=BaseModule)
