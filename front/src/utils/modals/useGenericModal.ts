import { useState, Dispatch, SetStateAction } from "react";

interface UseGenericModalRet {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}

export default function useGenericModal(): UseGenericModalRet {
  const [open, setOpen] = useState<boolean>(true);

  return { open, setOpen };
}
