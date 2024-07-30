const FRAMES = {
  loading: { url: "#" },
  index: { url: "#" },
  login: { url: "#" },
  qrscanner: { url: "#qrscanner" },
};

function showFrame(frameId) {
  const frameData = FRAMES[frameId];
  history.pushState(frameId, null, frameData.url);
  showFrame0(frameId, frameData);
}

async function awaitMaybePromise(p) {
  if (p instanceof Promise) {
    return await p;
  }
  return p;
}

async function showFrame0(frameId, frameData) {
  document.querySelectorAll(".frame").forEach((e) => {
    if (e.id.startsWith("frame-") && e.style.display == "") {
      e.style.display = "none";
      const closeFramedata = FRAMES[e.id.substring(6)];
      if (closeFramedata.closeHandler) {
        closeFramedata.closeHandler();
      }
    }
  });
  while (true) {
    if (frameData.preShowHandler) {
      let preShowResult = await awaitMaybePromise(frameData.preShowHandler());
      if (preShowResult != null) {
        frameId = preShowResult;
        frameData = FRAMES[frameId];
        continue;
      }
    }
    break;
  }
  document.getElementById(`frame-${frameId}`).style.display = "";
  if (frameData.showHandler) {
    frameData.showHandler();
  }
}

function sleep(delay) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, delay);
  });
}

window.addEventListener("popstate", (e) => {
  const frameData = FRAMES[e.state];
  if (frameData) {
    showFrame0(e.state, frameData);
  }
});

window.addEventListener("load", (e) => {
  showFrame("index");
});
