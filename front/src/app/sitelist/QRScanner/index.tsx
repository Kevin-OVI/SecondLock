import { IDetectedBarcode, Scanner } from "@yudiel/react-qr-scanner";
import { useState } from "react";
import { SiteInputCallback } from "../AddSiteButtons.tsx";
import styles from "./index.module.css";
import { Alert, CircularProgress, IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { ACTION } from "../../../utils/context/actionTypes.ts";
import { FieldErrors } from "../../../utils/types.ts";
import useAppContext from "../../../utils/context/useAppContext.ts";

const INVALID_QR_CODE = (
  <Alert severity="error" variant="filled">
    Le format du QR Code est invalide
  </Alert>
);

interface AddSiteQRCodeScannerProps {
  callback: SiteInputCallback;
}

export default function QRScanner({ callback }: AddSiteQRCodeScannerProps) {
  const [, dispatch] = useAppContext();
  const [loading, setLoading] = useState<boolean>(false);

  function close() {
    dispatch({ type: ACTION.DISPLAY_MODAL, payload: null });
  }

  async function handleScan(result: IDetectedBarcode[]) {
    setLoading(true);

    try {
      const value = result[0].rawValue;

      let url;
      try {
        url = new URL(value);
      } catch {
        dispatch({ type: ACTION.DISPLAY_SNACKBAR, payload: INVALID_QR_CODE });
        return;
      }

      if (url.protocol !== "otpauth:") {
        dispatch({ type: ACTION.DISPLAY_SNACKBAR, payload: INVALID_QR_CODE });
        return;
      }

      if (url.host !== "totp") {
        dispatch({
          type: ACTION.DISPLAY_SNACKBAR,
          payload: (
            <Alert severity="error" variant="filled">
              Nous ne prenons pas en charge cette méthode d'OTP : {url.host}.
            </Alert>
          ),
        });
        return;
      }

      const label = url.pathname.replace(/^\//, "");
      const params = new URLSearchParams(url.search);
      const secret = params.get("secret");
      if (secret === null) {
        dispatch({ type: ACTION.DISPLAY_SNACKBAR, payload: INVALID_QR_CODE });
        return;
      }

      const errors: FieldErrors = {};
      if (await callback({ name: label.substring(0, 64), secret }, errors)) {
        close();
      } else {
        dispatch({
          type: ACTION.DISPLAY_SNACKBAR,
          payload: (
            <Alert severity="error" variant="filled">
              {Object.entries(errors)
                .map(([k, v]) => `${k}: ${v}`)
                .join("\n")}
            </Alert>
          ),
        });
      }
    } finally {
      setLoading(false);
    }
  }

  function handleError(e: unknown) {
    console.error(e);
    dispatch({
      type: ACTION.DISPLAY_SNACKBAR,
      payload: (
        <Alert severity="error" variant="filled">
          Erreur lors de l'ouverture de la camera : {`${e}`}
        </Alert>
      ),
    });
    close();
  }

  return (
    <div className={styles.scanner}>
      <div className={styles.backButton}>
        <IconButton onClick={close}>
          <ArrowBackIcon />
        </IconButton>
      </div>
      <Scanner
        onScan={handleScan}
        onError={handleError}
        allowMultiple={false}
        formats={["qr_code"]}
        paused={loading}
        styles={{ video: { width: "", height: "", top: "", left: "" } }}
        classNames={{
          container: styles.scannerContainer,
          video: styles.scannerVideo,
        }}
      />
      <div className={styles.scannerOverlay}>
        {loading && (
          <div className={styles.loading}>
            <CircularProgress />
          </div>
        )}
      </div>
    </div>
  );
}
