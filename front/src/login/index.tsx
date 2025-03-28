import { useState } from "react";
import { Button, Link } from "@mui/material";
import styles from "../styles/form.module.css";
import { ACTION } from "../utils/context/actionTypes";
import PasswordStrengthBar from "../utils/components/password/PasswordStrengthBar";
import UsernameField from "../utils/components/fields/UsernameField.tsx";
import { wrapHandlerEnter } from "../utils/functions.ts";
import PasswordField from "../utils/components/fields/PasswordField.tsx";
import { FieldErrors } from "../utils/types.ts";
import PasswordConfirmField from "../utils/components/fields/PasswordConfirmField.tsx";
import {
  validateNewPassword,
  validatePassword,
  validateUsername,
} from "../utils/components/fields/validation.ts";
import useAppContext from "../utils/context/useAppContext.ts";
import { Navigate } from "react-router-dom";
import { HTTPError } from "../utils/context/api";

export default function Login() {
  const [{ username: storedUsername, api, token }, dispatch] = useAppContext();

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

      let response;
      try {
        response = await api.fetchAPI(
          "POST",
          register ? "/register" : "/login",
          {
            json: { username, password },
          },
        );
        console.log(response);
      } catch (e) {
        if (e instanceof HTTPError) {
          if (e.status === 409) {
            errors.username = "Le nom d'utilisateur est déjà utilisé.";
          } else if (e.status === 401) {
            errors.username = errors.password =
              "Nom d'utilisateur ou mot de passe incorrect";
          } else {
            api.handleUnexpectedError(e);
          }
          setErrors(errors);
        } else {
          api.handleUnexpectedError(e);
        }
        return;
      }
      dispatch({
        type: ACTION.LOAD_SESSION,
        payload: response.json,
      });
    } finally {
      setButtonDisabled(false);
    }
  }

  const handleEnter = wrapHandlerEnter(handleSubmit);

  if (token) {
    return <Navigate to="/app" />;
  }

  return (
    <div className={styles.loginForm}>
      <form>
        <h2 className={styles.formTitle}>
          {register ? "Créer un compte" : "Connexion"}
        </h2>

        <div className={styles.formFields}>
          <UsernameField
            username={username}
            setUsername={setUsername}
            errors={errors}
            setErrors={setErrors}
            onKeyDown={handleEnter}
            disabled={buttonDisabled}
          />

          <div className={styles.passwordField}>
            <PasswordField
              password={password}
              setPassword={setPassword}
              errors={errors}
              setErrors={setErrors}
              onKeyDown={handleEnter}
              disabled={buttonDisabled}
            />
            {register && (
              <>
                <PasswordStrengthBar password={password} />
                <PasswordConfirmField
                  passwordConfirm={passwordConfirm}
                  setPasswordConfirm={setPasswordConfirm}
                  errors={errors}
                  setErrors={setErrors}
                  onKeyDown={handleEnter}
                  disabled={buttonDisabled}
                />
              </>
            )}
          </div>
        </div>

        <div className={styles.formActions}>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={buttonDisabled}
          >
            {register ? "Créer un compte" : "Se connecter"}
          </Button>
          <Link
            className={styles.formActionLink}
            onClick={() => setRegister(!register)}
          >
            {register
              ? "Vous avez déjà un compte ?"
              : "Vous n'avez pas de compte ?"}
          </Link>
        </div>
      </form>
    </div>
  );
}
