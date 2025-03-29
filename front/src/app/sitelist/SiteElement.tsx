import { useState, useCallback } from "react";
import { ACTION } from "../../utils/context/actionTypes.ts";
import AddOrEditSiteModal from "./AddOrEditSiteModal.tsx";
import DeleteSiteModal, { SiteRemoveCallback } from "./DeleteSiteModal.tsx";
import styles from "./index.module.css";
import { IconButton, Menu, MenuItem, Tooltip } from "@mui/material";
import PopupState, {
  bindMenu,
  bindTrigger,
  InjectedProps,
} from "material-ui-popup-state";
import { SiteInputCallback } from "./AddSiteButtons.tsx";
import useAppContext from "../../utils/context/useAppContext.ts";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";

export interface Site {
  id: number;
  name: string;
  code: string;
}

export type SiteElementProps = {
  site: Site;
  handleRemoveSite: SiteRemoveCallback;
  updateSiteCallback: SiteInputCallback;
};

export default function SiteElement({
  site,
  handleRemoveSite,
  updateSiteCallback,
}: SiteElementProps) {
  const [codeCopied, setCodeCopied] = useState<boolean>(false);
  const [, dispatch] = useAppContext();

  const handleCopyCode = useCallback(async () => {
    await navigator.clipboard.writeText(site.code);
    setCodeCopied(true);
  }, [site.code]);

  const handleCopyLeave = useCallback(() => {
    setCodeCopied(false);
  }, []);

  return (
    <div className={styles.accountItem} onMouseLeave={handleCopyLeave}>
      <div className={styles.accountName}>
        <div>{site.name}</div>
        <PopupState variant="popover">
          {(popupState: InjectedProps) => {
            function handleEdit() {
              dispatch({
                type: ACTION.DISPLAY_MODAL,
                payload: (
                  <AddOrEditSiteModal
                    editSite={site}
                    callback={updateSiteCallback}
                  />
                ),
              });
              popupState.close();
            }

            function handleDelete() {
              dispatch({
                type: ACTION.DISPLAY_MODAL,
                payload: (
                  <DeleteSiteModal
                    site={site}
                    handleRemoveSite={handleRemoveSite}
                  />
                ),
              });
              popupState.close();
            }

            return (
              <>
                <IconButton {...bindTrigger(popupState)}>
                  <MoreHorizIcon />
                </IconButton>

                <Menu {...bindMenu(popupState)}>
                  <MenuItem onClick={handleEdit}>Modifier</MenuItem>
                  <MenuItem onClick={handleDelete}>Supprimer</MenuItem>
                </Menu>
              </>
            );
          }}
        </PopupState>
      </div>
      <Tooltip title={codeCopied ? "Code copié" : "Copier le code"}>
        <div className={styles.code} key={site.code} onClick={handleCopyCode}>
          <div>
            {site.code.substring(0, 3)} {site.code.substring(3)}
          </div>
          <IconButton>
            {codeCopied ? (
              <CheckIcon className={styles.copyIcon} />
            ) : (
              <ContentCopyIcon className={styles.copyIcon} />
            )}
          </IconButton>
        </div>
      </Tooltip>
    </div>
  );
}
