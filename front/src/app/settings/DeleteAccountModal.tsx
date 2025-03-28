import GenericModal from "../../utils/modals/GenericModal.tsx";
import { useState } from "react";
import { wrapHandlerEnter } from "../../utils/functions.ts";
import { FieldErrors, ModalButtonsState } from "../../utils/types.ts";
import PasswordField from "../../utils/components/fields/PasswordField.tsx";
import { validatePassword } from "../../utils/components/fields/validation.ts";
import { DeleteUserCallback } from "./useSettings.ts";
import DeleteAccountNote from "./DeleteAccountNote.tsx";

interface DeleteAccountProps {
  deleteUser: DeleteUserCallback;
}

export default function DeleteAccountModal({ deleteUser }: DeleteAccountProps) {
  const [open, setOpen] = useState(true);
  const [buttonsDisabled, setButtonsDisabled] = useState(false);
  const [password, setPassword] = useState<string>("");
  const [errors, setErrors] = useState<FieldErrors>({});

  function validateForm(): boolean {
    const errors: FieldErrors = {};

    validatePassword(password, errors, "currentPassword");

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

      if (await deleteUser(password, errors)) {
        setOpen(false);
      } else {
        setErrors(errors);
      }
    } finally {
      setButtonsDisabled(false);
    }
  }

  const handleEnter = wrapHandlerEnter(handleValidate);

  return (
    <GenericModal
      title="Supprimer le compte"
      exitOnClick={false}
      open={open}
      setOpen={setOpen}
      onValidate={handleValidate}
      buttonsState={
        buttonsDisabled ? ModalButtonsState.DISABLED : ModalButtonsState.DEFAULT
      }
    >
      <DeleteAccountNote />
      <PasswordField
        label="Mot de passe"
        name="currentPassword"
        password={password}
        setPassword={setPassword}
        onKeyDown={handleEnter}
        errors={errors}
        setErrors={setErrors}
        disabled={buttonsDisabled}
      />
    </GenericModal>
  );
}
