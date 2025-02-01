import {Dispatch, useContext} from "react";
import {Action, AppContextProps, Context} from "./Context.ts";

export default function useAppContext(): [AppContextProps, Dispatch<Action>] {
  const context = useContext(Context);
  if (!context) {
    throw new Error("useAppContext must be used within a ContextProvider");
  }
  return context;
}