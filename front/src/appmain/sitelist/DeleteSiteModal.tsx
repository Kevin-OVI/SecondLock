import GenericModal from "../../utils/modals/GenericModal";
import useGenericModal from "../../utils/modals/useGenericModal";
import {Site} from "./SiteElement";
import useAppContext from "../../utils/context/Context";

export type SiteRemoveCallback = (id: number) => void;

export interface DeleteSiteModalProps {
    site: Site;
    handleRemoveSite: SiteRemoveCallback;
}

export default function DeleteSiteModal({ site, handleRemoveSite }: DeleteSiteModalProps) {
  const [{ api }] = useAppContext();
  const { open, setOpen } = useGenericModal();

  async function handleValidate() {
    const res = await api.fetchAPI("DELETE", `/sites/${site.id}`);
    if (!res) return;
    if (res.status === 404) {
      alert("Ce site n'existe pas, peut-être a-t-il déjà été supprimé.");
    }
    handleRemoveSite(site.id);
    setOpen(false);
  }

  return (
    <GenericModal title="Suppression d'un site" onValidate={handleValidate} open={open} setOpen={setOpen}>
      <div>
        Êtes-vous sûr de vouloir supprimer le site <b>{site.name}</b> ?
      </div>
      <div className="small-text">
        Si vous n'avez pas d'autre moyen de générer les codes de double authentification, vous pourriez être dans l'incapacité de vous connecter à ce site.
      </div>
    </GenericModal>
  );
}
