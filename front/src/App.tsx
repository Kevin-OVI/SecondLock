import { createBrowserRouter, RouterProvider } from "react-router-dom";
import SiteList from "./main/sitelist";
import Login from "./login";
import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import useAppContext from "./utils/context/Context";
import ModalDisplayer from "./utils/modals/ModalDisplayer";
import QRScanner from "./main/qrscanner";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

function Main() {
  return (
    <RouterProvider
      router={createBrowserRouter([
        { path: "/", element: <SiteList /> },
        { path: "/qrscanner", element: <QRScanner /> },
      ])}
    />
  );
}

export default function App() {
  const [{ token }] = useAppContext();

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      {token ? <Main /> : <Login />}
      <ModalDisplayer />
    </ThemeProvider>
  );
}
