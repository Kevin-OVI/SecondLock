import { createRoot } from "react-dom/client";
import "./index.css";

import { ContextProvider } from "./utils/context/ContextProvider.tsx";
import { StrictMode } from "react";
import Login from "./login";
import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import ModalDisplayer from "./utils/modals/ModalDisplayer";
import Main from "./app";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Error404 from "./Error404";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ContextProvider>
      <ThemeProvider theme={darkTheme}>
        <BrowserRouter>
          <CssBaseline />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/app*" element={<Main />} />
            <Route path="/" element={<Navigate to="/app" />} />
            <Route path="*" element={<Error404 />} />
          </Routes>
          <ModalDisplayer />
        </BrowserRouter>
      </ThemeProvider>
    </ContextProvider>
  </StrictMode>
);
