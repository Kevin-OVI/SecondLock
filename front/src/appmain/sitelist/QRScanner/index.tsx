import {IDetectedBarcode, Scanner} from "@yudiel/react-qr-scanner";
import {useState} from "react";
import {SiteInputCallback} from "../AddSiteButtons.tsx";
import styles from "./index.module.css";
import {CircularProgress, IconButton} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import useAppContext from "../../../utils/context/Context.tsx";
import {ACTION} from "../../../utils/context/actionTypes.ts";
import {FieldErrors} from "../../../utils/types.ts";

const UNSUPPORTED_OTP_METHOD = "Nous ne prenons pas en charge cette méthode d'OTP : %s.";
const INVALID_QR_CODE = "Le format du QR Code est invalide";


interface AddSiteQRCodeScannerProps {
  callback: SiteInputCallback;
}


export default function QRScanner({callback}: AddSiteQRCodeScannerProps) {
  const [, dispatch] = useAppContext();
  const [loading, setLoading] = useState<boolean>(false);

  function close() {
    dispatch({type: ACTION.DISPLAY_MODAL, payload: null});
  }

  async function handleScan(result: IDetectedBarcode[]) {
    setLoading(true);

    try {
      const value = result[0].rawValue;

      let url;
      try {
        url = new URL(value);
      } catch {
        alert(INVALID_QR_CODE);
        return;
      }

      if (url.protocol !== "otpauth:") {
        alert(INVALID_QR_CODE);
        return;
      }

      if (url.host !== "totp") {
        alert(UNSUPPORTED_OTP_METHOD.replace("%s", url.host));
        return;
      }

      const label = url.pathname.replace(/^\//, "");
      const params = new URLSearchParams(url.search);
      const secret = params.get("secret");
      if (secret === null) {
        alert(INVALID_QR_CODE);
        return;
      }

      const errors: FieldErrors = {};
      if (await callback({name: label.substring(0, 64), secret}, errors)) {
        close();
      } else {
        alert(Object.entries(errors).map(([k, v]) => `${k}: ${v}`).join("\n"));
      }
    } finally {
      setLoading(false);
    }
  }

  function handleError(e: unknown) {
    console.error(e);
    alert("Erreur lors de l'ouverture de la camera : " + e);
    close();
  }

  return (
    <div className={styles.scanner}>
      <div className={styles.backButton}>
        <IconButton onClick={close}>
          <ArrowBackIcon/>
        </IconButton>
      </div>
      <Scanner
        onScan={handleScan}
        onError={handleError}
        allowMultiple={false}
        formats={["qr_code"]}
        paused={loading}
        styles={{video: {width: "", height: "", top: "", left: ""}}}
        classNames={{container: styles.scannerContainer, video: styles.scannerVideo}}
      />
      <div className={styles.scannerOverlay}>
        {loading && <div className={styles.loading}>
            <CircularProgress/>
        </div>}
      </div>
    </div>
  );
}
