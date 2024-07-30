document.addEventListener("DOMContentLoaded", () => {
  const dialog = document.getElementById("add-account-dialog");
  const manualButton = document.getElementById("add-account-manual-button");
  const qrButton = document.getElementById("add-account-qr-button");
  const accountList = document.getElementById("account-list");

  const dialogSiteNameField = document.getElementById("add-account-dialog-name");
  const dialogSiteSecretField = document.getElementById("add-account-dialog-secret");

  let updateSitesTaskId, nextSitesUpdate;

  function setTimerAnimation() {
    const [nextUpdateMs, lastUpdateTime] = nextSitesUpdate;
    const timeNow = new Date().getTime();
    const currentTime = 30000 - nextUpdateMs + timeNow - lastUpdateTime;

    for (let animation of getAnimationsByName("p6")) {
      animation.currentTime = currentTime;
    }
  }

  function hideButtons() {
    qrButton.classList.remove("fade-in");
    manualButton.classList.remove("fade-in");
    qrButton.classList.add("fade-out");
    manualButton.classList.add("fade-out");
    qrButton.addEventListener(
      "animationend",
      () => {
        qrButton.style.display = "none";
      },
      { once: true }
    );
    manualButton.addEventListener(
      "animationend",
      () => {
        manualButton.style.display = "none";
      },
      { once: true }
    );
  }

  function showbuttons() {
    qrButton.style.display = "block";
    manualButton.style.display = "block";
    qrButton.classList.remove("fade-out");
    manualButton.classList.remove("fade-out");
    qrButton.classList.add("fade-in");
    manualButton.classList.add("fade-in");

    setTimeout(() => window.addEventListener("click", hideButtons, { once: true }), 200);
  }

  async function updateSites() {
    if (!(await updateSites0())) {
      showFrame("login");
    }
  }

  async function updateSites0() {
    if (updateSitesTaskId != null) {
      clearInterval(updateSitesTaskId);
      updateSitesTaskId = null;
    }
    if (!APP_STATE.token) {
      return false;
    }
    const response = await fetchAPI("GET", "/sites");
    if (response.status == 200) {
      console.log(response.json);
      const { sites, next_update: nextUpdate } = response.json;
      let nextUpdateMs = Math.round(nextUpdate * 1000);
      nextSitesUpdate = [new Date().getTime(), nextUpdateMs];
      setTimerAnimation();

      updateSitesTaskId = setTimeout(updateSites, nextUpdateMs);
      accountList.innerHTML = "";
      for (let site of sites) {
        console.log(site);
        accountList.appendChild(
          createDOM({
            type: "div",
            className: "account-item",
            children: [
              {
                type: "div",
                className: "md-typescale-title-large account-name",
                children: [
                  site.name,
                  {
                    type: "div",
                    className: "edit-icon",
                  },
                ],
              },
              {
                type: "div",
                className: "md-typescale-headline-large code",
                innerText: site.code.substring(0, 3) + " " + site.code.substring(3),
              },
            ],
          })
        );
      }
      return true;
    } else if (response.status == 401) {
      return false;
    } else {
      alert(`Erreur ${response.status} : ${response.json.explain}`);
    }
  }

  document.getElementById("add-account-button").addEventListener("click", () => {
    if (qrButton.style.display === "block" && manualButton.style.display === "block") {
      //hideButtons();
    } else {
      showbuttons();
    }
  });

  manualButton.addEventListener("click", () => {
    dialog.showModal();
  });

  qrButton.addEventListener("click", () => {
    showFrame("qrscanner");
  });

  document.getElementById("cancel-add-button").addEventListener("click", () => dialog.close());
  document.getElementById("confirm-add-button").addEventListener("click", async () => {
    const name = dialogSiteNameField.value;
    const secret = dialogSiteSecretField.value;

    const response = await fetchAPI("POST", "/sites", { json: { name: name, secret: secret } });

    if (response.status == 401) {
      showFrame("login");
    } else {
      alert(`Erreur ${response.status} : ${response.json.explain}`);
    }
    dialog.close();
  });

  FRAMES["index"].preShowHandler = async () => {
    return (await updateSites0()) ? null : "login";
  };

  FRAMES["index"].showHandler = () => {
    setTimerAnimation();
  };

  FRAMES["index"].closeHandler = () => {
    hideButtons();
    dialog.close();
    if (updateSitesTaskId != null) {
      clearTimeout(updateSitesTaskId);
    }
  };

  // Temporaire
  document.querySelector(".main-header").addEventListener("click", () => location.reload());
});
