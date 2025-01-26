import TextInput from "../TextInput.tsx";
import {Dispatch, KeyboardEventHandler, SetStateAction} from "react";
import {FieldErrors} from "../../types.ts";


export const usernameCharPattern = /[a-z0-9\-_]*/g;
export const usernamePattern = /^[a-z0-9\-_]{4,16}$/;


interface UsernameFieldProps {
  label?: string;
  name?: string;
  username: string;
  setUsername: Dispatch<string>;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
  errors: FieldErrors;
  setErrors: Dispatch<SetStateAction<FieldErrors>>;
  autoFocus?: boolean;
  disabled?: boolean;
}


export default function UsernameField(
  {label = "Nom d'utilisateur", name = "username", username, setUsername, onKeyDown, errors, setErrors, autoFocus = false, disabled = false}: UsernameFieldProps,
) {
  return <TextInput
    label={label}
    name={name}
    type="text"
    value={username}
    onChange={(e) => {
      const value = e.target.value.toLowerCase();
      const invalidChar = value.replace(usernameCharPattern, "");

      if (invalidChar) {
        setErrors((prev) => ({...prev, [name]: `Le caractère "${invalidChar}" est invalide`}));
        return;
      }
      setUsername(value);
      setErrors((prev) => {
        delete prev[name];
        return prev;
      });
    }}
    onKeyDown={onKeyDown}
    error={errors[name]}
    required
    fullWidth
    autoFocus={autoFocus}
    disabled={disabled}
  />;
}