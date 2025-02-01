import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

import {ContextProvider} from "./utils/context/ContextProvider.tsx";
import {StrictMode} from "react";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ContextProvider>
      <App />
    </ContextProvider>
  </StrictMode>
);
