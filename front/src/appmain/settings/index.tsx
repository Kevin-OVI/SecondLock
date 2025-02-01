import styles from "./index.module.css";
import genericStyles from "../../styles/generic.module.css";
import {Button} from "@mui/material";
import EditUsernameModal from "./EditUsernameModal.tsx";
import {ACTION} from "../../utils/context/actionTypes.ts";
import {FieldErrors} from "../../utils/types.ts";
import EditPasswordModal from "./EditPasswordModal.tsx";
import useAppContext from "../../utils/context/useAppContext.ts";


interface EditUserFields {
  newUsername?: string;
  newPassword?: string;
}

export type EditUserCallback = (fields: EditUserFields, currentPassword: string, errors: FieldErrors) => Promise<boolean>;

interface UsernameEditorProps {
  editUser: EditUserCallback;
}


function UsernameEditor({editUser}: UsernameEditorProps) {
  const [{username}, dispatch] = useAppContext();

  return <div className={styles.actionRow}>
    <div>
      <h3 className={genericStyles.smallTitle}>Nom d'utilisateur</h3>
      <div>{username}</div>
    </div>
    <Button variant="outlined" onClick={() => {
      dispatch({type: ACTION.DISPLAY_MODAL, payload: <EditUsernameModal editUser={editUser}/>});
    }}>Modifier</Button>
  </div>;
}


export default function Settings() {
  const [{api}, dispatch] = useAppContext();

  async function editUser(fields: EditUserFields, currentPassword: string, errors: FieldErrors): Promise<boolean> {
    const payload: Record<string, string> = {password: currentPassword};
    if (fields.newUsername) {
      payload.new_username = fields.newUsername;
    }
    if (fields.newPassword) {
      payload.new_password = fields.newPassword;
    }

    const response = await api.fetchAPIRaiseStatus("PATCH", "/user", {json: payload});
    if (!response) {
      return false;
    }
    if (response.status === 200) {
      dispatch({type: ACTION.LOAD_SESSION, payload: {username: response.json.username, token: response.json.token}});
      return true;
    }
    if (response.status === 409) {
      errors.username = "Le nom d'utilisateur est déjà utilisé.";
    } else if (response.status === 403) {
      errors.currentPassword = "Le mot de passe est incorrect.";
    } else {
      alert(`Erreur ${response.status} : ${response.json.explain}`);
    }
    return false;
  }

  return <div className={styles.settings}>
    <h1>Paramètres</h1>

    <div className={styles.actions}>
      <UsernameEditor editUser={editUser}/>
      <Button
        variant="outlined"
        onClick={() => dispatch({type: ACTION.DISPLAY_MODAL, payload: <EditPasswordModal editUser={editUser}/>})}
      >
        Modifier le mot de passe
      </Button>
    </div>
  </div>;
}