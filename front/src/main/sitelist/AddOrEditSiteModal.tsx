import { useState } from "react";
import { Site } from "./SiteElement";
import GenericModal, { ModalButtonsState } from "../../utils/modals/GenericModal";
import TextInput from "../../utils/components/TextInput";
import useGenericModal from "../../utils/modals/useGenericModal";

export interface InputSite {
  id?: number;
  name: string;
  secret: string;
}

export type FieldErrors = Partial<Record<"name" | "secret", string>>;
export type SiteInputCallback = (site: InputSite, errors: FieldErrors) => Promise<boolean>;

interface AddOrEditSiteModalProps {
  editSite?: Site;
  callback: SiteInputCallback;
}

export default function AddOrEditSiteModal({ editSite, callback }: AddOrEditSiteModalProps) {
  const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false);
  const [name, setName] = useState(editSite?.name || "");
  const [secret, setSecret] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const { open, setOpen } = useGenericModal();

  function validateForm() {
    const errors: FieldErrors = {};

    if (!name) errors.name = "Le nom du compte est requis";
    else if (name.length > 64) errors.name = "Le nom du compte doit faire au maximum 64 caractères";

    if (!editSite) {
      if (!secret) errors.secret = "La clé secrète est requise";
    }

    setErrors(errors);

    return Object.keys(errors).length > 0;
  }

  async function handleSubmit() {
    if (buttonsDisabled) {
      console.error("Button is disabled, cannot login");
      return;
    }
    setButtonsDisabled(true);

    try {
      if (validateForm()) {
        return;
      }

      const errors: FieldErrors = {};
      if (await callback({ id: editSite?.id, name, secret }, errors)) {
        setOpen(false);
      } else {
        setErrors(errors);
      }
    } finally {
      setButtonsDisabled(false);
    }
  }

  async function handleEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") await handleSubmit();
  }

  return (
    <GenericModal
      title="Ajouter un compte"
      onValidate={handleSubmit}
      exitOnClick={false}
      buttonsState={buttonsDisabled ? ModalButtonsState.DISABLED : ModalButtonsState.DEFAULT}
      open={open}
      setOpen={setOpen}>
      <TextInput
        type="text"
        name="name"
        value={name}
        label="Nom du compte"
        placeholder="Ex: Google, GitHub, Dropbox"
        onChange={(e) => {
          setName(e.target.value);
          setErrors({});
        }}
        onKeyDown={handleEnter}
        error={errors.name}
        fullWidth
        required
        autoFocus
      />

      {editSite == null && (
        <TextInput
          type="password"
          name="secret"
          value={secret}
          label="Clé secrète"
          onChange={(e) => {
            setSecret(e.target.value);
            setErrors({});
          }}
          onKeyDown={handleEnter}
          error={errors.secret}
          fullWidth
          required
        />
      )}
    </GenericModal>
  );
}
