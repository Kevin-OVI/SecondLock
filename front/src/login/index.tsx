import { useState } from "react";
import { Button, Link } from "@mui/material";
import styles from "../styles/form.module.css";
import TextInput from "../utils/components/TextInput";
import useAppContext from "../utils/context/Context";
import { ACTION } from "../utils/context/actionTypes";
import PasswordStrengthBar, { isPasswordStrong } from "../utils/components/password/PasswordStrengthBar";

interface FieldErrors {
  username?: string;
  password?: string;
  passwordConfirm?: string;
}

const usernameCharPattern = /[a-z0-9\-_]*/g;
const usernamePattern = /^[a-z0-9\-_]{4,16}$/;

export default function Login() {
  const [{ username: storedUsername, api }, dispatch] = useAppContext();

  const [register, setRegister] = useState<boolean>(false);
  const [buttonDisabled, setButtonDisabled] = useState<boolean>(false);
  const [username, setUsername] = useState<string>(storedUsername || "");
  const [password, setPassword] = useState<string>("");
  const [passwordConfirm, setPasswordConfirm] = useState<string>("");

  const [errors, setErrors] = useState<FieldErrors>({});

  function validateForm(): boolean {
    const errors: FieldErrors = {};

    if (username) {
      if (!username.match(usernamePattern))
        errors.username = "Le nom d'utilisateur doit être composé de lettres, de chiffres, de tirets ou d'underscores et doit faire entre 4 et 16 caractères.";
    } else errors.username = "Le nom d'utilisateur est requis.";

    if (!password) errors.password = "Le mot de passe est requis.";
    else if (register) {
      if (!isPasswordStrong(password)) errors.password = "Le mot de passe n'est pas assez fort.";
      else if (password !== passwordConfirm) errors.passwordConfirm = "Les mots de passes ne correspondent pas";
    }

    setErrors(errors);

    return Object.keys(errors).length > 0;
  }

  async function handleSubmit() {
    if (buttonDisabled) {
      return;
    }
    setButtonDisabled(true);

    try {
      if (validateForm()) {
        return;
      }

      const errors: FieldErrors = {};

      if (register) {
        const response = await api.fetchAPI("POST", "/register", { json: { username, password } });
        if (response.status === 409) {
          errors.username = "Le nom d'utilisateur est déjà utilisé.";
        } else if (response.status === 201) {
          dispatch({ type: ACTION.LOAD_SESSION, payload: { username: response.json.username, token: response.json.token } });
        } else {
          alert(`Erreur ${response.status} : ${response.json.explain}`);
        }
      } else {
        const response = await api.fetchAPI("POST", "/login", { json: { username, password } });
        if (response.status === 401) {
          errors.username = errors.password = "Nom d'utilisateur ou mot de passe incorrect";
        } else if (response.status === 200) {
          dispatch({ type: ACTION.LOAD_SESSION, payload: { username: response.json.username, token: response.json.token } });
        } else {
          alert(`Erreur ${response.status} : ${response.json.explain}`);
        }
      }

      setErrors(errors);
    } finally {
      setButtonDisabled(false);
    }
  }

  async function handleEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") await handleSubmit();
  }

  return (
    <div className={styles.loginForm}>
      <form>
        <h2 className={styles.formTitle}>{register ? "Créer un compte" : "Connexion"}</h2>

        <div className={styles.formFields}>
          <TextInput
            label="Nom d'utilisateur"
            name="username"
            type="text"
            value={username}
            onChange={(e) => {
              const value = e.target.value.toLowerCase();
              const invalidChar = value.replace(usernameCharPattern, "");

              if (invalidChar) {
                setErrors({ username: `Le caractère "${invalidChar}" est invalide` });
                return;
              }
              setUsername(value);
              setErrors({});
            }}
            onKeyDown={handleEnter}
            error={errors.username}
            required
            fullWidth
            autoFocus
          />

          <div className={styles.passwordField}>
            <TextInput
              label="Mot de passe"
              name="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors({});
              }}
              onKeyDown={handleEnter}
              error={errors.password}
              required
              fullWidth
            />
            {register && (
              <>
                <PasswordStrengthBar password={password} />
                <TextInput
                  label="Confirmation du mot de passe"
                  name="password-confirm"
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => {
                    setPasswordConfirm(e.target.value);
                    setErrors({});
                  }}
                  onKeyDown={handleEnter}
                  error={errors.passwordConfirm}
                  required
                  fullWidth
                />
              </>
            )}
          </div>
        </div>

        <div className={styles.formActions}>
          <Button variant="contained" onClick={handleSubmit} disabled={buttonDisabled}>
            {register ? "Créer un compte" : "Se connecter"}
          </Button>
          <Link className={styles.formActionLink} onClick={() => setRegister(!register)}>
            {register ? "Vous avez déjà un compte ?" : "Vous n'avez pas de compte ?"}
          </Link>
        </div>
      </form>
    </div>
  );
}
