import GenericModal from "../../utils/modals/GenericModal.tsx";
import useGenericModal from "../../utils/modals/useGenericModal.ts";
import { Site } from "./SiteElement.tsx";

import useAppContext from "../../utils/context/useAppContext.ts";
import { HTTPError } from "../../utils/context/api";
import { ACTION } from "../../utils/context/actionTypes.ts";
import { Alert } from "@mui/material";

export type SiteRemoveCallback = (id: number) => void;

export interface DeleteSiteModalProps {
  site: Site;
  handleRemoveSite: SiteRemoveCallback;
}

export default function DeleteSiteModal({
  site,
  handleRemoveSite,
}: DeleteSiteModalProps) {
  const [{ api }, dispatch] = useAppContext();
  const { open, setOpen } = useGenericModal();

  async function handleValidate() {
    try {
      await api.fetchAPI("DELETE", `/sites/${site.id}`);
    } catch (e) {
      if (e instanceof HTTPError) {
        if (e.status === 404) {
          dispatch({
            type: ACTION.DISPLAY_SNACKBAR,
            payload: (
              <Alert severity="error" variant="filled">
                Ce site n'existe pas, peut-être a-t-il déjà été supprimé.
              </Alert>
            ),
          });
        } else {
          api.handleUnexpectedError(e);
        }
      } else {
        api.handleUnexpectedError(e);
      }
      return;
    }
    handleRemoveSite(site.id);
    setOpen(false);
  }

  return (
    <GenericModal
      title="Suppression d'un site"
      onValidate={handleValidate}
      open={open}
      setOpen={setOpen}
    >
      <div>
        Êtes-vous sûr de vouloir supprimer le site <b>{site.name}</b> ?
      </div>
      <div className="small-text">
        Si vous n'avez pas d'autre moyen de générer les codes de double
        authentification, vous pourriez être dans l'incapacité de vous connecter
        à ce site.
      </div>
    </GenericModal>
  );
}
