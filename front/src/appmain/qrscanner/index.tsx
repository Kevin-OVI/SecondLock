import { IDetectedBarcode, Scanner } from "@yudiel/react-qr-scanner";

export default function QRScanner() {
  // TODO : À terminer sur une machine avec une caméra

  const handleScan = (result: IDetectedBarcode[]) => {
    console.log(result);
  };

  return (
    <div>
      <Scanner onScan={handleScan} allowMultiple={false} />
    </div>
  );
}
