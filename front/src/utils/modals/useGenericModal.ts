import { useState } from "react";

interface UseGenericModalRet {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function useGenericModal(): UseGenericModalRet {
  const [open, setOpen] = useState<boolean>(true);

  return { open, setOpen };
}
