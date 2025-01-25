import {CSSProperties, useRef, useState} from "react";
import useAppContext from "../../utils/context/Context";
import LocalMenu from "../../utils/components/LocalMenu";
import AddAccountImage from "./images/add_account.svg";
import AddAccountQrImage from "./images/add_account_qr.svg";
import {ACTION} from "../../utils/context/actionTypes";
import AddOrEditSiteModal from "./AddOrEditSiteModal";
import AddAccountManualImage from "./images/add_account_manual.svg";
import {Transition, TransitionStatus} from "react-transition-group";
import styles from "./index.module.css";
import {Tooltip} from "@mui/material";
import QRScanner from "./QRScanner";

export interface InputSite {
  id?: number;
  name: string;
  secret: string;
}
export type FieldErrors = Partial<Record<"name" | "secret", string>>;
export type SiteInputCallback = (site: InputSite, errors: FieldErrors) => Promise<boolean>;

interface AddSiteButtonsProps {
  callback: SiteInputCallback;
}

const transitionDuration = 250;

const defaultStyle = {
  transition: `opacity ${transitionDuration}ms ease-in-out`,
  opacity: 0,
};

const transitionStyles: Record<TransitionStatus, CSSProperties> = {
  entering: {opacity: 1},
  entered: {opacity: 1},
  exiting: {opacity: 0},
  exited: {opacity: 0, display: "none"},
  unmounted: {opacity: 0, display: "none"},
};

export function AddSiteButtons({callback}: AddSiteButtonsProps) {
  const [, dispatch] = useAppContext();
  const menuButtonsRef = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState<boolean>(false);

  function displayOrHideMenu() {
    setDisplay(prevState => !prevState);
  }

  function closeMenu() {
    setDisplay(false);
  }


  return (
    <LocalMenu
      className={styles.addButtons}
      hideCallback={closeMenu}>
      <Tooltip title="Ajouter un compte" placement="left">
        <button onClick={displayOrHideMenu} className={display ? "open" : ""}>
          <img src={AddAccountImage} alt="Ajouter un compte"/>
        </button>
      </Tooltip>

      <Transition nodeRef={menuButtonsRef} in={display} timeout={transitionDuration}>
        {(state: TransitionStatus) => (
          <div ref={menuButtonsRef} style={{
            ...defaultStyle,
            ...transitionStyles[state],
          }}>
            <Tooltip title="Scanner un QR-code" placement="left">
              <button onClick={() => {
                closeMenu();
                // TODO QR Scanner
              }}>
                <img src={AddAccountQrImage} alt="Scanner un QR-code"/>
              </button>
            </Tooltip>

            <Tooltip title="Entrée manuelle" placement="left">
              <button onClick={() => {
                closeMenu();
                dispatch({type: ACTION.DISPLAY_MODAL, payload: <AddOrEditSiteModal callback={callback}/>});
              }}>
                <img src={AddAccountManualImage} alt="Entrée manuelle"/>
              </button>
            </Tooltip>
          </div>
        )}
      </Transition>
    </LocalMenu>
  );
}