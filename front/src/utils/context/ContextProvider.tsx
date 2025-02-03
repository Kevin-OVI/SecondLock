import { ReactElement, ReactNode, useEffect, useReducer } from "react";
import { ACTION } from "./actionTypes.ts";
import { Action, AppContextProps, Context } from "./Context.ts";
import { API } from "./api.ts";

const initialState: AppContextProps = {
  username: localStorage.username,
  token: localStorage.token,
  api: new API(),
};

const reducer = (state: AppContextProps, action: Action): AppContextProps => {
  switch (action.type) {
    case ACTION.LOAD_SESSION:
      state = {
        ...state,
        username: action.payload.username,
        token: action.payload.token,
      };
      break;
    case ACTION.DISCONNECT:
      state = { ...state, token: undefined, displayedModal: undefined };
      break;
    case ACTION.DISPLAY_MODAL:
      state = { ...state, displayedModal: action.payload };
      break;
  }

  return state;
};

interface ContextProviderProps {
  children: ReactNode;
}

export function ContextProvider({
  children,
}: ContextProviderProps): ReactElement {
  const [state, dispatch] = useReducer(reducer, initialState);
  state.api.context = state;
  state.api.dispatch = dispatch;

  useEffect(() => {
    if (import.meta.env.DEV) {
      // @ts-expect-error Set debugging variables
      window.context = state;
      // @ts-expect-error Set debugging variables
      window.dispatchContext = dispatch;
    }
    if (state.token) localStorage.token = state.token;
    else delete localStorage.token;

    if (state.username) localStorage.username = state.username;
    else delete localStorage.username;
  }, [state]); // Only re-run the effect if cart changes

  return (
    <Context.Provider value={[state, dispatch]}>{children}</Context.Provider>
  );
}
