import {FieldErrors} from "../../types.ts";
import {usernamePattern} from "./UsernameField.tsx";
import isPasswordStrong from "../password/checker.ts";

export function validateUsername(username: string, errors: FieldErrors, key: string = "username") {
  if (username) {
    if (!username.match(usernamePattern))
      errors[key] = "Le nom d'utilisateur doit être composé de lettres, de chiffres, de tirets ou d'underscores et doit faire entre 4 et 16 caractères.";
  } else errors[key] = "Le nom d'utilisateur est requis.";
}

export function validatePassword(password: string, errors: FieldErrors, key: string = "password") {
  if (!password) errors[key] = "Le mot de passe est requis.";
}

export function validateNewPassword(password: string, passwordConfirm: string, errors: FieldErrors, key: string = "password", confirmKey: string = "passwordConfirm") {
  if (!isPasswordStrong(password)) errors[key] = "Le mot de passe n'est pas assez fort.";
  else if (password !== passwordConfirm) errors[confirmKey] = "Les mots de passes ne correspondent pas";
}