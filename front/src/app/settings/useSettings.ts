import useAppContext from "../../utils/context/useAppContext.ts";
import { FieldErrors } from "../../utils/types.ts";
import { ACTION } from "../../utils/context/actionTypes.ts";
import { Dispatch } from "react";
import { Action } from "../../utils/context/Context.ts";
import { HTTPError } from "../../utils/context/api.ts";

interface EditUserFields {
  newUsername?: string;
  newPassword?: string;
}

export type EditUserCallback = (
  fields: EditUserFields,
  currentPassword: string,
  errors: FieldErrors,
) => Promise<boolean>;
export type DeleteUserCallback = (
  currentPassword: string,
  errors: FieldErrors,
) => Promise<boolean>;

interface UseSettingsReturn {
  dispatch: Dispatch<Action>;
  username?: string;
  editUser: EditUserCallback;
  deleteUser: DeleteUserCallback;
}

export default function useSettings(): UseSettingsReturn {
  const [{ api, username }, dispatch] = useAppContext();

  async function editUser(
    fields: EditUserFields,
    currentPassword: string,
    errors: FieldErrors,
  ): Promise<boolean> {
    const payload: Record<string, string> = { password: currentPassword };
    if (fields.newUsername) {
      payload.new_username = fields.newUsername;
    }
    if (fields.newPassword) {
      payload.new_password = fields.newPassword;
    }

    let response;
    try {
      response = await api.fetchAPI("PATCH", "/user", {
        json: payload,
      });
    } catch (e) {
      if (e instanceof HTTPError) {
        if (e.status === 409) {
          errors.username = "Le nom d'utilisateur est déjà utilisé.";
        } else if (e.status === 403) {
          errors.currentPassword = "Le mot de passe est incorrect.";
        } else {
          api.handleUnexpectedError(e);
        }
      } else {
        api.handleUnexpectedError(e);
      }
      return false;
    }
    dispatch({
      type: ACTION.LOAD_SESSION,
      payload: response.json,
    });
    return true;
  }

  async function deleteUser(
    currentPassword: string,
    errors: FieldErrors,
  ): Promise<boolean> {
    try {
      await api.fetchAPI("DELETE", "/user", {
        json: { password: currentPassword },
      });
    } catch (e) {
      if (e instanceof HTTPError) {
        if (e.status === 403) {
          errors.currentPassword = "Le mot de passe est incorrect.";
        } else {
          api.handleUnexpectedError(e);
        }
      } else {
        api.handleUnexpectedError(e);
      }
      return false;
    }
    dispatch({ type: ACTION.DISCONNECT });
    alert("Votre compte a bien été supprimé.");
    return true;
  }

  return { dispatch, username, editUser, deleteUser };
}
