import {createContext, useContext, useReducer, ReactNode, Dispatch, useEffect, ReactElement} from "react";
import {ACTION} from "./actionTypes";
import {API} from "./api";

export interface AppContextProps {
  username?: string;
  token?: string;
  api: API;
  displayedModal?: ReactElement;
}

export interface Action {
  type: ACTION;
  payload?: any;
}

const initialState: AppContextProps = {
  username: localStorage.username,
  token: localStorage.token,
  api: new API(),
};

const reducer = (state: AppContextProps, action: Action): AppContextProps => {
  switch (action.type) {
    case ACTION.LOAD_SESSION:
      state = {...state, username: action.payload.username, token: action.payload.token};
      break;
    case ACTION.DISCONNECT:
      state = {...state, token: undefined, displayedModal: undefined};
      break;
    case ACTION.DISPLAY_MODAL:
      state = {...state, displayedModal: action.payload};
      break;
    default:
      console.error(`Unknown action type ${action.type}; payload=${action.payload}`);
      break;
  }

  return state;
};

const Context = createContext<[AppContextProps, Dispatch<Action>] | null>(null);

interface ContextProviderProps {
  children: ReactNode;
}

export function ContextProvider({children}: ContextProviderProps): ReactElement {
  const [state, dispatch] = useReducer(reducer, initialState);
  state.api.context = state;
  state.api.dispatch = dispatch;

  useEffect(() => {
    if (import.meta.env.DEV) {
      // @ts-ignore
      window.context = state;
      // @ts-ignore
      window.dispatchContext = dispatch;
    }
    if (state.token) localStorage.token = state.token;
    else delete localStorage.token;

    if (state.username) localStorage.username = state.username;
    else delete localStorage.username;
  }, [state]); // Only re-run the effect if cart changes

  return <Context.Provider value={[state, dispatch]}>{children}</Context.Provider>;
};

export default function useAppContext(): [AppContextProps, Dispatch<Action>] {
  const context = useContext(Context);
  if (!context) {
    throw new Error("useAppContext must be used within a ContextProvider");
  }
  return context;
}
