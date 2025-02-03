import styles from "./index.module.css";
import genericStyles from "../../styles/generic.module.css";
import { Button } from "@mui/material";
import EditUsernameModal from "./EditUsernameModal.tsx";
import { ACTION } from "../../utils/context/actionTypes.ts";
import EditPasswordModal from "./EditPasswordModal.tsx";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import LockIcon from "@mui/icons-material/Lock";
import useSettings from "./useSettings.ts";
import DeleteAccountModal from "./DeleteAccountModal.tsx";
import DeleteAccountNote from "./DeleteAccountNote.tsx";

export default function Settings() {
  const { dispatch, username, editUser, deleteUser } = useSettings();

  return (
    <div className={styles.settings}>
      <h1>Paramètres</h1>

      <div className={styles.actions}>
        <h2>Authentification</h2>

        <div className={`${styles.actionGroup} ${styles.row}`}>
          <div>
            <h3 className={genericStyles.smallTitle}>Nom d'utilisateur</h3>
            <div>{username}</div>
          </div>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => {
              dispatch({
                type: ACTION.DISPLAY_MODAL,
                payload: <EditUsernameModal editUser={editUser} />,
              });
            }}
          >
            Modifier
          </Button>
        </div>
        <Button
          variant="outlined"
          startIcon={<LockIcon />}
          onClick={() =>
            dispatch({
              type: ACTION.DISPLAY_MODAL,
              payload: <EditPasswordModal editUser={editUser} />,
            })
          }
        >
          Modifier le mot de passe
        </Button>
      </div>

      <div className={styles.actions}>
        <h2>Suppression du compte</h2>
        <DeleteAccountNote />
        <Button
          variant="contained"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() =>
            dispatch({
              type: ACTION.DISPLAY_MODAL,
              payload: <DeleteAccountModal deleteUser={deleteUser} />,
            })
          }
        >
          Supprimer mon compte
        </Button>
      </div>
    </div>
  );
}
