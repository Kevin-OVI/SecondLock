from __future__ import annotations

import abc
import asyncio
import logging
import traceback
import weakref
from typing import Callable, Any, Coroutine, Type

__all__ = ("AutoLogger", "TaskLoop", "AsyncContextManagerMixin", "ContextManagerMixin", "Counter", "SiteHost")


class AutoLogger:
    __slots__ = ()

    logger: logging.Logger

    def __init_subclass__(cls):
        cls.logger = logging.getLogger(cls.__name__)


class TaskLoop(abc.ABC):
    __slots__ = ("_delay", "_task", "_state")

    def __init__(self, delay: float):
        self._delay = delay

        self._task: asyncio.Task | None = None
        self._state = 0

    async def _run(self, args, kwargs):
        # noinspection PyBroadException
        try:
            while self._state:
                self._state = 2
                await self._func(*args, **kwargs)
                if not self._state:
                    break
                self._state = 1
                await asyncio.sleep(self._delay)
        except Exception:
            traceback.print_exc()
        finally:
            self._state = 0
            self._task = None

    def start(self, *args, **kwargs):
        if self._state:
            raise RuntimeError("Task is already running")
        self._state = 1
        self._task = asyncio.create_task(self._run(args, kwargs))

    def stop(self):
        if self._task is not None:
            if self._state == 1:
                self._task.cancel()
            elif self._state == 2:
                self._state = 0

    def cancel(self):
        if self._task is not None:
            self._state = 0
            self._task.cancel()

    async def stop_wait(self):
        self.stop()
        if self._task is not None:
            await self._task

    async def __call__(self, *args, **kwargs):
        return await self._func(*args, **kwargs)

    @property
    def running(self) -> bool:
        return self._task is not None

    @property
    @abc.abstractmethod
    def _func(self):
        pass

    @classmethod
    def loop(cls, delay: float):
        def deco(func: Callable[[Any, ...], Coroutine]) -> TaskLoop:
            return _DescriptorTaskLoop(delay, func)

        return deco


class _InstanceTaskLoop(TaskLoop):
    __slots__ = ("_func_ref",)

    def __init__(self, delay: float, _func_ref: weakref.WeakMethod[Callable[[Any, ...], Coroutine]]):
        super().__init__(delay)
        self._func_ref = _func_ref

    @property
    def _func(self):
        return self._func_ref()


class _DescriptorTaskLoop(TaskLoop):
    __slots__ = ("_func", "_instance_refs",)

    def __init__(self, delay: float, func: Callable[..., Coroutine]):
        super().__init__(delay)
        self._func = func
        self._instance_refs: dict[weakref.WeakMethod, TaskLoop] = {}

    def __get__(self, obj: Any, objtype: Type[Any]) -> TaskLoop:
        if obj is None:
            return self

        copy = self._instance_refs.get(obj)
        if copy is None:
            method = self._func.__get__(obj, objtype)
            weak_method = weakref.WeakMethod(method, self._on_gc)
            copy = _InstanceTaskLoop(self._delay, weak_method)
            self._instance_refs[weak_method] = copy
        return copy

    def _on_gc(self, weak_method):
        copy = self._instance_refs.pop(weak_method, None)
        if copy is not None:
            copy.stop()


class AsyncContextManagerMixin(abc.ABC):
    __slots__ = ()

    @abc.abstractmethod
    async def acquire(self): pass

    @abc.abstractmethod
    async def release(self): pass

    async def __aenter__(self):
        return await self.acquire()

    async def __aexit__(self, exc_type, exc, tb):
        return await self.release()


class ContextManagerMixin(abc.ABC):
    __slots__ = ()

    @abc.abstractmethod
    def acquire(self): pass

    @abc.abstractmethod
    def release(self): pass

    def __enter__(self):
        return self.acquire()

    def __exit__(self, exc_type, exc, tb):
        return self.release()


class Counter(ContextManagerMixin):
    def __init__(self):
        self.counter = 0
        self.zero_event = asyncio.Event()
        self.zero_event.set()

    def acquire(self):
        self.zero_event.clear()
        self.counter += 1

    def release(self):
        if self.counter < 1:
            raise ValueError("Counter released to many times")
        self.counter -= 1
        if self.counter < 1:
            self.zero_event.set()

    async def wait(self):
        await self.zero_event.wait()


class SiteHost:
    __slots__ = ("_hosts", "_hash")

    def __init__(self, *hosts: str):
        self._hosts = set(hosts)
        self._hash = hash((self.__class__, *hosts))

    def has_host(self, host: str) -> bool:
        return host in self._hosts

    def __eq__(self, other) -> bool:
        if isinstance(other, SiteHost):
            if other.__class__ != SiteHost:
                return NotImplemented
            return self._hosts == other._hosts
        return False

    def __hash__(self) -> int:
        return self._hash
