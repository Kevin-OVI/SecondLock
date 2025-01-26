import GenericModal, {ModalButtonsState} from "../../utils/modals/GenericModal.tsx";
import {useState} from "react";
import {wrapHandlerEnter} from "../../utils/functions.ts";
import {FieldErrors} from "../../utils/types.ts";
import PasswordField from "../../utils/components/fields/PasswordField.tsx";
import {validatePassword} from "../../utils/components/fields/validation.ts";
import {EditUserCallback} from "./index.tsx";
import PasswordStrengthBar from "../../utils/components/password/PasswordStrengthBar.tsx";
import PasswordConfirmField from "../../utils/components/fields/PasswordConfirmField.tsx";


interface EditPasswordModalProps {
  editUser: EditUserCallback;
}


export default function EditPasswordModal({editUser}: EditPasswordModalProps) {
  const [open, setOpen] = useState(true);
  const [buttonsDisabled, setButtonsDisabled] = useState(false);
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>("");
  const [errors, setErrors] = useState<FieldErrors>({});

  function validateForm(): boolean {
    const errors: FieldErrors = {};

    validatePassword(currentPassword, errors, "currentPassword");
    validatePassword(newPassword, errors, "newPassword", confirmNewPassword, "confirmNewPassword");

    setErrors(errors);

    return Object.keys(errors).length > 0;
  }

  async function handleValidate() {
    if (buttonsDisabled) {
      return;
    }

    setButtonsDisabled(true);
    try {
      if (validateForm()) {
        return;
      }

      const errors: FieldErrors = {};

      if (await editUser({newPassword}, currentPassword, errors)) {
        setOpen(false);
      } else {
        setErrors(errors);
      }
    } finally {
      setButtonsDisabled(false);
    }
  }

  const handleEnter = wrapHandlerEnter(handleValidate);

  return <GenericModal
    title="Modifier le mot de passe"
    exitOnClick={false}
    open={open}
    setOpen={setOpen}
    onValidate={handleValidate}
    buttonsState={buttonsDisabled ? ModalButtonsState.DISABLED : ModalButtonsState.DEFAULT}
  >
    <PasswordField
      label="Mot de passe actuel"
      name="currentPassword"
      password={currentPassword}
      setPassword={setCurrentPassword}
      onKeyDown={handleEnter}
      errors={errors}
      setErrors={setErrors}
    />
    <PasswordField
      label="Nouveau mot de passe"
      name="newPassword"
      password={newPassword}
      setPassword={setNewPassword}
      onKeyDown={handleEnter}
      errors={errors}
      setErrors={setErrors}
    />
    <PasswordStrengthBar password={newPassword}/>
    <PasswordConfirmField
      label="Confirmer le nouveau mot de passe"
      name="confirmNewPassword"
      passwordConfirm={confirmNewPassword}
      setPasswordConfirm={setConfirmNewPassword}
      onKeyDown={handleEnter}
      errors={errors}
      setErrors={setErrors}
    />
  </GenericModal>;
}