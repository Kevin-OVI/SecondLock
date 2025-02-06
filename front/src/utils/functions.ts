import { KeyboardEventHandler, KeyboardEvent } from "react";

export function wrapHandlerEnter<T = Element>(
  callback: KeyboardEventHandler<T>,
): KeyboardEventHandler<T> {
  return function handleEnter(e: KeyboardEvent<T>) {
    if (e.key === "Enter") return callback(e);
  };
}

export function formatDurationSeconds(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  seconds = seconds % 86400;
  const hours = Math.floor(seconds / 3600);
  seconds = seconds % 3600;
  const minutes = Math.floor(seconds / 60);
  seconds = seconds % 60;

  const allParts = [
    { value: days, unit: "jour" },
    { value: hours, unit: "heure" },
    { value: minutes, unit: "minute" },
    { value: seconds, unit: "seconde" },
  ];

  const parts = allParts
    .filter((part) => part.value > 0)
    .splice(0, 2)
    .map((part) => `${part.value} ${part.unit}${part.value > 1 ? "s" : ""}`);

  return parts.join(" ");
}
