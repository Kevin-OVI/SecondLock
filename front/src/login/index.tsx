import {useState} from "react";
import {Button, Link} from "@mui/material";
import styles from "../styles/form.module.css";
import {ACTION} from "../utils/context/actionTypes";
import PasswordStrengthBar from "../utils/components/password/PasswordStrengthBar";
import UsernameField from "../utils/components/fields/UsernameField.tsx";
import {wrapHandlerEnter} from "../utils/functions.ts";
import PasswordField from "../utils/components/fields/PasswordField.tsx";
import {FieldErrors} from "../utils/types.ts";
import PasswordConfirmField from "../utils/components/fields/PasswordConfirmField.tsx";
import {validateNewPassword, validatePassword, validateUsername} from "../utils/components/fields/validation.ts";
import useAppContext from "../utils/context/useAppContext.ts";
import {Navigate} from "react-router-dom";

export default function Login() {
  const [{username: storedUsername, api, token}, dispatch] = useAppContext();

  const [register, setRegister] = useState<boolean>(false);
  const [buttonDisabled, setButtonDisabled] = useState<boolean>(false);
  const [username, setUsername] = useState<string>(storedUsername || "");
  const [password, setPassword] = useState<string>("");
  const [passwordConfirm, setPasswordConfirm] = useState<string>("");

  const [errors, setErrors] = useState<FieldErrors>({});

  function validateForm(): boolean {
    const errors: FieldErrors = {};

    validateUsername(username, errors);
    validatePassword(password, errors);
    if (register) {
      validateNewPassword(password, passwordConfirm, errors);
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
        const response = await api.fetchAPI("POST", "/register", {json: {username, password}});
        if (response.status === 409) {
          errors.username = "Le nom d'utilisateur est déjà utilisé.";
        } else if (response.status === 201) {
          dispatch({type: ACTION.LOAD_SESSION, payload: {username: response.json.username, token: response.json.token}});
        } else {
          alert(`Erreur ${response.status} : ${response.json.explain}`);
        }
      } else {
        const response = await api.fetchAPI("POST", "/login", {json: {username, password}});
        if (response.status === 401) {
          errors.username = errors.password = "Nom d'utilisateur ou mot de passe incorrect";
        } else if (response.status === 200) {
          dispatch({type: ACTION.LOAD_SESSION, payload: {username: response.json.username, token: response.json.token}});
        } else {
          alert(`Erreur ${response.status} : ${response.json.explain}`);
        }
      }

      setErrors(errors);
    } finally {
      setButtonDisabled(false);
    }
  }

  const handleEnter = wrapHandlerEnter(handleSubmit);

  if (token) {
    return <Navigate to="/app"/>
  }

  return (
    <div className={styles.loginForm}>
      <form>
        <h2 className={styles.formTitle}>{register ? "Créer un compte" : "Connexion"}</h2>

        <div className={styles.formFields}>
          <UsernameField username={username} setUsername={setUsername} errors={errors} setErrors={setErrors} onKeyDown={handleEnter}/>

          <div className={styles.passwordField}>
            <PasswordField password={password} setPassword={setPassword} errors={errors} setErrors={setErrors} onKeyDown={handleEnter}/>
            {register && (
              <>
                <PasswordStrengthBar password={password}/>
                <PasswordConfirmField
                  passwordConfirm={passwordConfirm}
                  setPasswordConfirm={setPasswordConfirm}
                  errors={errors}
                  setErrors={setErrors}
                  onKeyDown={handleEnter}
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
