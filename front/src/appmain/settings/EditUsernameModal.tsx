import GenericModal, {ModalButtonsState} from "../../utils/modals/GenericModal.tsx";
import {useState} from "react";
import UsernameField from "../../utils/components/fields/UsernameField.tsx";
import {wrapHandlerEnter} from "../../utils/functions.ts";
import {FieldErrors} from "../../utils/types.ts";
import useAppContext from "../../utils/context/Context.tsx";
import PasswordField from "../../utils/components/fields/PasswordField.tsx";
import {validatePassword, validateUsername} from "../../utils/components/fields/validation.ts";
import {EditUserCallback} from "./index.tsx";


interface EditUsernameProps {
  editUser: EditUserCallback;
}


export default function EditUsernameModal({editUser}: EditUsernameProps) {
  const [{username: storedUsername}] = useAppContext();

  const [open, setOpen] = useState(true);
  const [buttonsDisabled, setButtonsDisabled] = useState(false);
  const [username, setUsername] = useState<string>(storedUsername || "");
  const [password, setPassword] = useState<string>("");
  const [errors, setErrors] = useState<FieldErrors>({});

  function validateForm(): boolean {
    const errors: FieldErrors = {};

    validateUsername(username, errors);
    validatePassword(password, errors);

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

      if (await editUser({newUsername: username}, password, errors)) {
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
    title="Modifier le nom d'utilisateur"
    exitOnClick={false}
    open={open}
    setOpen={setOpen}
    onValidate={handleValidate}
    buttonsState={buttonsDisabled ? ModalButtonsState.DISABLED : ModalButtonsState.DEFAULT}
  >
    <UsernameField
      label="Nouveau nom d'utilisateur"
      username={username}
      setUsername={setUsername}
      onKeyDown={handleEnter}
      errors={errors}
      setErrors={setErrors}
      autoFocus
    />
    <PasswordField
      label="Mot de passe actuel"
      name="currentPassword"
      password={password}
      setPassword={setPassword}
      onKeyDown={handleEnter}
      errors={errors}
      setErrors={setErrors}
    />
  </GenericModal>;
}