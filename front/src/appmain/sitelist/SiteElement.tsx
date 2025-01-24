import { useState, useEffect } from "react";
import { ACTION } from "../../utils/context/actionTypes";
import useAppContext from "../../utils/context/Context";
import AddOrEditSiteModal, { SiteInputCallback } from "./AddOrEditSiteModal";
import DeleteSiteModal from "./DeleteSiteModal";
import styles from "./index.module.css";
import { Menu, MenuItem, Tooltip } from "@mui/material";
import PopupState, { bindMenu, bindTrigger, InjectedProps } from "material-ui-popup-state";

export interface Site {
  id: number;
  name: string;
  code: string;
}

export interface SiteProps {
  site: Site;
}

export type SiteElementProps = {
  handleRemoveSite: (id: number) => void;
  updateSiteCallback: SiteInputCallback;
} & SiteProps;

export default function SiteElement({ site, handleRemoveSite, updateSiteCallback }: SiteElementProps) {
  const [codeCopied, setCodeCopied] = useState<boolean>(false);
  const [, dispatch] = useAppContext();

  useEffect(() => {
    if (codeCopied) {
      const timer = setTimeout(() => {
        setCodeCopied(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [codeCopied]);

  return (
    <div className={styles.accountItem}>
      <div className={styles.accountName}>
        <div>{site.name}</div>
        <PopupState variant="popover">
          {(popupState: InjectedProps) => (
            <>
              <div className={styles.editIcon} {...bindTrigger(popupState)} />

              <Menu {...bindMenu(popupState)}>
                <MenuItem
                  onClick={() => {
                    dispatch({ type: ACTION.DISPLAY_MODAL, payload: <AddOrEditSiteModal editSite={site} callback={updateSiteCallback} /> });
                    popupState.close();
                  }}>
                  Modifier
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    dispatch({ type: ACTION.DISPLAY_MODAL, payload: <DeleteSiteModal site={site} handleRemoveSite={handleRemoveSite} /> });
                    popupState.close();
                  }}>
                  Supprimer
                </MenuItem>
              </Menu>
            </>
          )}
        </PopupState>
      </div>
      <Tooltip title={codeCopied ? "Code copié" : "Copier le code"}>
        <div
          className={styles.code}
          key={site.code}
          onClick={() => {
            navigator.clipboard.writeText(site.code);
            setCodeCopied(true);
          }}>
          <div>
            {site.code.substring(0, 3)} {site.code.substring(3)}
          </div>
          <div className={styles.copyIcon} />
        </div>
      </Tooltip>
    </div>
  );
}
