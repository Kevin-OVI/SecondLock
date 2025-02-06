import { createContext, Dispatch, ReactElement, ReactNode } from "react";
import { ACTION } from "./actionTypes";
import { API } from "./api";

export interface AppContextProps {
  username?: string;
  token?: string;
  api: API;
  displayedModal?: ReactNode;
  snackbar?: ReactElement;
}

export type Action =
  | { type: ACTION.LOAD_SESSION; payload: { username: string; token: string } }
  | { type: ACTION.DISCONNECT }
  | { type: ACTION.DISPLAY_MODAL; payload?: ReactNode }
  | { type: ACTION.DISPLAY_SNACKBAR; payload?: ReactElement };

export const Context = createContext<
  [AppContextProps, Dispatch<Action>] | null
>(null);
