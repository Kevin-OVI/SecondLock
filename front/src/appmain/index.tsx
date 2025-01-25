import {Route, Routes, useNavigate} from "react-router-dom";
import SiteList from "./sitelist";
import {AppBar, Container, IconButton, ListItemIcon, Menu, MenuItem, Toolbar, Tooltip} from "@mui/material";
import styles from "./index.module.css";
import PopupState, {bindMenu, bindTrigger, InjectedProps} from "material-ui-popup-state";
import useAppContext from "../utils/context/Context.tsx";
import {AccountCircle, Logout, Settings as SettingsIcon} from "@mui/icons-material";
import {ACTION} from "../utils/context/actionTypes.ts";
import Settings from "./settings";

export default function Main() {
  const navigate = useNavigate();
  const [{username}, dispatch] = useAppContext();

  return <>
    <AppBar position="sticky" className={styles.navbar}>
      <Container maxWidth={false}>
        <Toolbar disableGutters sx={{display: "flex", justifyContent: "space-between"}}>
          <img className={styles.logo} onClick={() => navigate("/")} src="/logo_full.svg" alt="Logo"/>

          <PopupState variant="popover">
            {(popupState: InjectedProps) => (
              <>
                <Tooltip title={`Connecté en tant que ${username}`}>
                  <IconButton size="large" {...bindTrigger(popupState)}>
                    <AccountCircle className={styles.accountButton} />
                  </IconButton>
                </Tooltip>

                <Menu {...bindMenu(popupState)}>
                  <MenuItem onClick={() => {
                    navigate("/settings");
                    popupState.close();
                  }}>
                    <ListItemIcon>
                      <SettingsIcon fontSize="small"/>
                    </ListItemIcon>
                    Paramètres
                  </MenuItem>
                  <MenuItem onClick={() => {
                    dispatch({type: ACTION.DISCONNECT});
                    popupState.close();
                  }}>
                    <ListItemIcon>
                      <Logout fontSize="small"/>
                    </ListItemIcon>
                    Déconnexion
                  </MenuItem>
                </Menu>
              </>
            )}
          </PopupState>
        </Toolbar>
      </Container>
    </AppBar>

    <Routes>
      <Route path="/" element={<SiteList/>}/>
      <Route path="settings" element={<Settings/>}/>
    </Routes>
  </>;
}