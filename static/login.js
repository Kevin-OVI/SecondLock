window.addEventListener("DOMContentLoaded", () => {
  const USERNAME_PATTERN = /^[a-z0-9\-_]{4,16}$/;

  const usernameField = document.getElementById("login-username-field");
  const passwordField = document.getElementById("login-password-field");
  const confirmPasswordField = document.getElementById("register-confirm-password-field");

  const loginTitle = document.querySelector("#frame-login > dialog > .dialog-title");
  const switchMoveButton = document.getElementById("switch-login-mode");
  const connectButton = document.getElementById("connect-button");

  const usernameError = document.getElementById("login-username-error");
  const passwordError = document.getElementById("login-password-error");

  let isRegister = false;
  let loginError = false;

  function clearErrors() {
    loginError = false;
    usernameError.innerText = "";
    passwordError.innerText = "";
  }

  function setError(element, error) {
    loginError = true;
    if (!element.innerText) {
      element.innerText = error;
    }
  }

  async function doLogin() {
    if (connectButton.disabled) return;
    connectButton.disabled = true;
    try {
      clearErrors();

      const username = (usernameField.value = usernameField.value.toLowerCase());
      const password = passwordField.value;
      const passwordConfirm = confirmPasswordField.value;

      if (!username) {
        setError(usernameError, "Le nom d'utilisateur est requis.");
      }
      if (!password) {
        setError(passwordError, "Le mot de passe est requis.");
      }
      if (!username.match(USERNAME_PATTERN)) {
        setError(
          usernameError,
          "Le nom d'utilisateur doit être composé de lettre, de chiffres, de tirets ou d'underscores et doit faire entre 4 et 16 caractères."
        );
      }

      if (isRegister && password != passwordConfirm) {
        setError(passwordError, "Les mots de passe entrés ne correspondent pas.");
      }

      if (loginError) {
        return;
      }

      if (isRegister) {
        const response = await fetchAPI("POST", "/register", { json: { username, password } });
        if (response.status == 409) {
          setError(usernameError, "Le nom d'utilisateur est déjà utilisé.");
        } else if (response.status == 200) {
          storeLogin(username, response.json.token);
          showFrame("index");
        } else {
          alert(`Erreur ${response.status} : ${response.json.explain}`);
        }
      } else {
        const response = await fetchAPI("POST", "/login", { json: { username, password } });
        console.log(response);
        if (response.status == 401) {
          setError(usernameError, "Nom d'utilisateur ou mot de passe incorrect");
          setError(passwordError, "Nom d'utilisateur ou mot de passe incorrect");
        } else if (response.status == 200) {
          storeLogin(username, response.json.token);
          showFrame("index");
        } else {
          alert(`Erreur ${response.status} : ${response.json.explain}`);
        }
      }
    } finally {
      connectButton.disabled = false;
    }
  }

  function loginKeyPress(e) {
    if (e.key == "Enter") doLogin();
  }

  connectButton.addEventListener("click", doLogin);
  usernameField.addEventListener("keypress", loginKeyPress);
  passwordField.addEventListener("keypress", loginKeyPress);
  confirmPasswordField.addEventListener("keypress", loginKeyPress);

  switchMoveButton.addEventListener("click", () => {
    isRegister = !isRegister;
    enableStateFeatures();
  });

  function enableStateFeatures() {
    if (isRegister) {
      confirmPasswordField.parentElement.style.display = "";
      loginTitle.innerText = "Création d'un compte";
      switchMoveButton.innerText = "Vous avez déjà un compte ?";
    } else {
      confirmPasswordField.parentElement.style.display = "none";
      loginTitle.innerText = "Connexion";
      switchMoveButton.innerText = "Vous n'avez pas de compte ?";
    }
  }

  FRAMES["login"].showHandler = () => {
    isRegister = false;
    usernameField.value = APP_STATE.username || "";
    enableStateFeatures();
  };

  FRAMES["login"].closeHandler = () => {
    usernameField.value = passwordField.value = confirmPasswordField.value = "";
  };
});
