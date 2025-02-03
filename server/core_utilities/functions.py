from __future__ import annotations

import asyncio
import datetime
import logging
from typing import MutableMapping, MutableSequence, Any

import pytz

__all__ = (
    "LOCAL_TIMEZONE",
    "cancel_tasks",
    "silent_delitem",
    "silent_remove",
    "frozen_partial",
    "local_now",
    "ainput",
)
LOCAL_TIMEZONE = pytz.timezone("Europe/Paris")


def cancel_tasks(to_cancel: set[asyncio.Task], loop: asyncio.AbstractEventLoop) -> None:
    if not to_cancel:
        return

    for task in to_cancel:
        task.cancel()

    async def timeout():
        remaining_tasks = to_cancel.copy()
        while remaining_tasks:
            await asyncio.sleep(5)
            for task in remaining_tasks.copy():
                if task.done():
                    remaining_tasks.discard(task)
                else:
                    logging.info(f"Still waiting for task {task!r}...")

    timeout_task = loop.create_task(timeout())
    loop.run_until_complete(asyncio.gather(*to_cancel, return_exceptions=True))
    timeout_task.cancel()

    for task in to_cancel:
        if task.cancelled():
            continue
        if task.exception() is not None:
            loop.call_exception_handler(
                {
                    "message": "unhandled exception during asyncio.run() shutdown",
                    "exception": task.exception(),
                    "task": task,
                }
            )


def silent_delitem(d: MutableMapping, key: Any):
    try:
        del d[key]
    except KeyError:
        pass


def silent_remove(d: MutableSequence, item: Any):
    try:
        d.remove(item)
    except ValueError:
        pass


def frozen_partial(func, /, *args, **kwargs):
    def overwrite(*_, **__):
        return func(*args, **kwargs)

    return overwrite


def local_now() -> datetime.datetime:
    return datetime.datetime.now(LOCAL_TIMEZONE)


async def ainput(prompt: str = "", /) -> str:
    return await asyncio.get_event_loop().run_in_executor(None, input, prompt)
