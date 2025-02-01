import {ReactNode, useRef} from "react";
import "./GenericModal.css";
import {Button, Dialog, DialogActions, DialogContent, DialogTitle} from "@mui/material";
import {ACTION} from "../context/actionTypes";
import useAppContext from "../context/useAppContext.ts";
import {ModalButtonsState} from "../types.ts";

export interface GenericModalProps {
  title?: ReactNode;
  children?: ReactNode;
  exitOnClick?: boolean;
  onClose?: (node: HTMLElement) => void;
  onValidate?: () => void;
  buttonsState?: ModalButtonsState;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function GenericModal({
  title,
  children,
  exitOnClick = false,
  onClose,
  onValidate,
  buttonsState = ModalButtonsState.DEFAULT,
  open,
  setOpen,
}: GenericModalProps) {
  const [, dispatch] = useAppContext();
  const dialogRef = useRef<HTMLDivElement>(null);

  function handleDialogClose(_event: unknown, reason: "backdropClick" | "escapeKeyDown" | "cancelButton") {
    if (reason === "backdropClick" && !exitOnClick) {
      return;
    }
    setOpen(false);
  }

  function handleDialogCloseTransitionEnded(node: HTMLElement) {
    if (onClose === undefined) {
      dispatch({ type: ACTION.DISPLAY_MODAL });
    } else {
      onClose(node);
    }
  }

  return (
    <Dialog ref={dialogRef} open={open} onClose={handleDialogClose} slotProps={{ transition: { onExited: handleDialogCloseTransitionEnded } }}>
      {title && <DialogTitle>{title}</DialogTitle>}

      <DialogContent>{children}</DialogContent>

      <DialogActions>
        {buttonsState !== ModalButtonsState.HIDDEN && (
          <>
            <Button variant="outlined" onClick={() => handleDialogClose(null, "cancelButton")} disabled={buttonsState === ModalButtonsState.DISABLED}>
              Annuler
            </Button>
            {onValidate && (
              <Button variant="contained" onClick={onValidate} disabled={buttonsState === ModalButtonsState.DISABLED}>
                Valider
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
