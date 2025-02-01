import useAppContext from "../../utils/context/useAppContext.ts";
import {FieldErrors} from "../../utils/types.ts";
import {ACTION} from "../../utils/context/actionTypes.ts";
import {Dispatch} from "react";
import {Action} from "../../utils/context/Context.ts";

interface EditUserFields {
  newUsername?: string;
  newPassword?: string;
}

export type EditUserCallback = (fields: EditUserFields, currentPassword: string, errors: FieldErrors) => Promise<boolean>;
export type DeleteUserCallback = (currentPassword: string, errors: FieldErrors) => Promise<boolean>;

interface UseSettingsReturn {
  dispatch: Dispatch<Action>;
  username?: string;
  editUser: EditUserCallback;
  deleteUser: DeleteUserCallback;
}

export default function useSettings(): UseSettingsReturn {
  const [{api, username}, dispatch] = useAppContext();

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

  async function deleteUser(currentPassword: string, errors: FieldErrors): Promise<boolean> {
    const response = await api.fetchAPIRaiseStatus("DELETE", "/user", {json: {password: currentPassword}});
    if (!response) {
      return false;
    }
    if (response.status === 204) {
      dispatch({type: ACTION.DISCONNECT});
      return true;
    }
    if (response.status === 403) {
      errors.currentPassword = "Le mot de passe est incorrect.";
    } else {
      alert(`Erreur ${response.status} : ${response.json.explain}`);
    }
    return false;
  }

  return {dispatch, username, editUser, deleteUser};
}