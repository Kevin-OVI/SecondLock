import {WarningNote} from "../../utils/components/notes";

export default function DeleteAccountNote() {
  return <WarningNote>
    <p>Supprimer votre compte entrainera la suppression immédiate et définitive de tous les comptes enregistrés.</p>
    <p>
      Si vous n'avez pas d'autre moyen de générer les codes de double authentification, vous pourriez être dans
      l'incapacité de vous connecter à tous vos comptes.
    </p>
  </WarningNote>;
}