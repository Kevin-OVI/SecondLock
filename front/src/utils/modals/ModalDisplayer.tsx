import useAppContext from "../context/useAppContext.ts";

export default function ModalDisplayer() {
  const [{ displayedModal }] = useAppContext();

  if (displayedModal) {
    return displayedModal;
  }
  return null;
}
