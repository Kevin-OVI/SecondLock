import Login from "./login";
import {createTheme, CssBaseline, ThemeProvider} from "@mui/material";
import ModalDisplayer from "./utils/modals/ModalDisplayer";
import Main from "./appmain";
import {BrowserRouter} from "react-router-dom";
import useAppContext from "./utils/context/useAppContext.ts";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});


export default function App() {
  const [{token}] = useAppContext();

  return (
    <ThemeProvider theme={darkTheme}>
      <BrowserRouter>
        <CssBaseline/>
        {token ? <Main/> : <Login/>}
        <ModalDisplayer/>
      </BrowserRouter>
    </ThemeProvider>
  );
}
