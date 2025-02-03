from __future__ import annotations

import logging
import os.path
import time

__all__ = ("DayFileHandler",)


class DayFileHandler(logging.FileHandler):
    def __init__(self, directory: str = "logs", level=None):
        self.directory = directory
        now = time.localtime()
        super().__init__(self.get_current_filename(now), "a", encoding="utf-8")
        self.last_day = self.get_time_tuple(now)
        if level is not None:
            self.setLevel(level)

    def get_current_filename(self, now: time.struct_time):
        return os.path.abspath(
            os.path.join(
                self.directory,
                f"{now.tm_year}-{now.tm_mon:>02d}-{now.tm_mday:>02d}.log",
            )
        )

    @staticmethod
    def get_time_tuple(now: time.struct_time):
        return now.tm_year, now.tm_mon, now.tm_mday

    def emit(self, record: logging.LogRecord):
        now = time.localtime()
        current_day = self.get_time_tuple(now)
        if current_day != self.last_day:
            self.acquire()
            try:
                try:
                    if self.stream:
                        try:
                            self.flush()
                        finally:
                            stream = self.stream
                            # noinspection PyTypeChecker
                            self.stream = None
                            if hasattr(stream, "close"):
                                stream.close()
                finally:
                    logging.StreamHandler.close(self)
                self._closed = False
                self.baseFilename = self.get_current_filename(now)
                self.last_day = current_day
            finally:
                self.release()

        super().emit(record)
