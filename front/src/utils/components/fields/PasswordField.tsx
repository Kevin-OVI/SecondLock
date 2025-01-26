import TextInput from "../TextInput.tsx";
import {Dispatch, KeyboardEventHandler, SetStateAction} from "react";


interface PasswordFieldProps {
  label?: string;
  name?: string;
  password: string;
  setPassword: Dispatch<string>;
  errors: Record<string, string>;
  setErrors: Dispatch<SetStateAction<Record<string, string>>>;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
  disabled?: boolean;
  autoFocus?: boolean;
}


export default function PasswordField(
  {label = "Mot de passe", name = "password", password, setPassword, errors, setErrors, onKeyDown, disabled, autoFocus}: PasswordFieldProps,
) {
  return <TextInput
    label={label}
    name={name}
    type="password"
    value={password}
    onChange={(e) => {
      setPassword(e.target.value);
      setErrors(prev => {
        delete prev[name];
        return prev;
      });
    }}
    onKeyDown={onKeyDown}
    error={errors[name]}
    required
    fullWidth
    disabled={disabled}
    autoFocus={autoFocus}
  />;
}