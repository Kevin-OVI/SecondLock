import useAppContext from "../context/Context";

export default function ModalDisplayer() {
  const [{displayedModal}] = useAppContext();

  if (displayedModal) {
    return displayedModal;
  }
  return null;
}