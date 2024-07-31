document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("scanner");
  let stream;

  async function startScanner() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      video.srcObject = stream;
      video.play();
      requestAnimationFrame(tick);
      return null;
    } catch (err) {
      console.trace(err);
      alert("Impossible d'accéder à la caméra !");
      return "index";
    }
  }

  function stopScanner() {
    if (stream != null) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    video.srcObject = null;
    video.style.display = "";
  }

  FRAMES["qrscanner"].preShowHandler = startScanner;
  FRAMES["qrscanner"].closeHandler = stopScanner;

  function tick() {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      video.style.display = "block";
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        console.log(`QR Code détecté : ${code.data}`);
        showFrame("index");
      }
    }
    requestAnimationFrame(tick);
  }
});
