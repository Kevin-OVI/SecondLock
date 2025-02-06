import { Snackbar } from "@mui/material";
import useAppContext from "../context/useAppContext";
import { ReactElement, useEffect, useState } from "react";
import { ACTION } from "../context/actionTypes";

enum SnackbarStatus {
  VISIBLE,
  CLOSING,
  CLOSED,
}

export default function SnackbarDisplayer() {
  const [{ snackbar }, dispatch] = useAppContext();
  const [displayedSnackbar, setDisplayedSnackbar] = useState<
    ReactElement | undefined
  >(undefined);
  const [state, setState] = useState(SnackbarStatus.CLOSED);

  useEffect(() => {
    if (snackbar) {
      if (state === SnackbarStatus.CLOSED) {
        setDisplayedSnackbar(snackbar);
        setState(SnackbarStatus.VISIBLE);
        dispatch({ type: ACTION.DISPLAY_SNACKBAR });
      } else {
        setState(SnackbarStatus.CLOSING);
      }
    } else {
      if (state === SnackbarStatus.CLOSED) {
        setDisplayedSnackbar(undefined);
      }
    }
  }, [snackbar, state]);

  return (
    <Snackbar
      open={state === SnackbarStatus.VISIBLE}
      autoHideDuration={6000}
      onClose={() => setState(SnackbarStatus.CLOSING)}
      TransitionProps={{ onExited: () => setState(SnackbarStatus.CLOSED) }}
    >
      {displayedSnackbar}
    </Snackbar>
  );
}
