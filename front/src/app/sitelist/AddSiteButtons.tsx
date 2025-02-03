import {useState} from "react";
import {ACTION} from "../../utils/context/actionTypes.ts";
import AddOrEditSiteModal from "./AddOrEditSiteModal.tsx";
import {SpeedDial, SpeedDialAction, SpeedDialIcon} from "@mui/material";
import QRScanner from "./QRScanner/index.tsx";
import {FieldErrors} from "../../utils/types.ts";
import QrCodeIcon from "@mui/icons-material/QrCode";
import CreateIcon from "@mui/icons-material/Create";
import useAppContext from "../../utils/context/useAppContext.ts";

export interface InputSite {
  id?: number;
  name: string;
  secret: string;
}

export type SiteInputCallback = (site: InputSite, errors: FieldErrors) => Promise<boolean>;

interface AddSiteButtonsProps {
  callback: SiteInputCallback;
}

export function AddSiteButtons({callback}: AddSiteButtonsProps) {
  const [, dispatch] = useAppContext();
  const [open, setOpen] = useState<boolean>(false);

  function handleOpen() {
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
  }

  function handleAddQrCode() {
    handleClose();
    dispatch({type: ACTION.DISPLAY_MODAL, payload: <QRScanner callback={callback}/>});
  }

  function handleAddManual() {
    handleClose();
    dispatch({type: ACTION.DISPLAY_MODAL, payload: <AddOrEditSiteModal callback={callback}/>});
  }

  return (
    <SpeedDial
      ariaLabel="Ajouter un compte"
      icon={<SpeedDialIcon/>}
      sx={{position: "fixed", bottom: 16, right: 16}}
      onClose={handleClose}
      onOpen={handleOpen}
      open={open}
    >
      <SpeedDialAction icon={<QrCodeIcon/>} tooltipTitle="Scanner un QR-Code" onClick={handleAddQrCode}/>
      <SpeedDialAction icon={<CreateIcon/>} tooltipTitle="Entrer manuellement" onClick={handleAddManual}/>
    </SpeedDial>
  );
}