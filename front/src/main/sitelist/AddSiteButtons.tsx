import {CSSProperties, useRef, useState} from "react";
import useAppContext from "../../utils/context/Context";
import LocalMenu from "../../utils/components/LocalMenu";
import AddAccountImage from "./images/add_account.svg";
import AddAccountQrImage from "./images/add_account_qr.svg";
import {ACTION} from "../../utils/context/actionTypes";
import AddOrEditSiteModal, { SiteInputCallback } from "./AddOrEditSiteModal";
import AddAccountManualImage from "./images/add_account_manual.svg";
import {Transition, TransitionStatus} from "react-transition-group";
import styles from "./index.module.css";

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
  exited: {opacity: 0},
  unmounted: {opacity: 0},
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
      <button onClick={displayOrHideMenu} className={display ? "open" : ""}>
        <img src={AddAccountImage} alt="Ajouter un compte"/>
      </button>

      <Transition nodeRef={menuButtonsRef} in={display} timeout={transitionDuration}>
        {(state: TransitionStatus) => (
          <div ref={menuButtonsRef} style={{
            ...defaultStyle,
            ...transitionStyles[state],
          }}>
            <button onClick={() => {
              closeMenu();
              // TODO QR Scanner
            }}>
              <img src={AddAccountQrImage} alt="Scanner un QR-code"/>
            </button>

            <button onClick={() => {
              closeMenu();
              dispatch({type: ACTION.DISPLAY_MODAL, payload: <AddOrEditSiteModal callback={callback}/>});
            }}>
              <img src={AddAccountManualImage} alt="Entrée manuelle"/>
            </button>
          </div>
        )}
      </Transition>
    </LocalMenu>
  );
}