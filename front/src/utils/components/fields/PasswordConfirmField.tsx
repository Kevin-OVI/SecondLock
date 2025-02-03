import TextInput from "../TextInput.tsx";
import { Dispatch, KeyboardEventHandler, SetStateAction } from "react";

interface PasswordConfirmFieldProps {
  label?: string;
  name?: string;
  passwordConfirm: string;
  setPasswordConfirm: Dispatch<string>;
  errors: Record<string, string>;
  setErrors: Dispatch<SetStateAction<Record<string, string>>>;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
  disabled?: boolean;
  autoFocus?: boolean;
}

export default function PasswordConfirmField({
  label = "Confirmation du mot de passe",
  name = "passwordConfirm",
  passwordConfirm,
  setPasswordConfirm,
  errors,
  setErrors,
  onKeyDown,
  disabled,
  autoFocus,
}: PasswordConfirmFieldProps) {
  return (
    <TextInput
      label={label}
      name={name}
      type="password"
      value={passwordConfirm}
      onChange={(e) => {
        setPasswordConfirm(e.target.value);
        setErrors((prev) => {
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
    />
  );
}
