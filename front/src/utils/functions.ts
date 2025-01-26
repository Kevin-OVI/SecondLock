import {KeyboardEventHandler, KeyboardEvent} from "react";

export function wrapHandlerEnter<T = Element>(callback: KeyboardEventHandler<T>): KeyboardEventHandler<T> {
  return function handleEnter(e: KeyboardEvent<T>) {
    if (e.key === "Enter") return callback(e);
  };
}