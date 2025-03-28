import { Dispatch } from "react";
import { Action, AppContextProps } from "./Context.ts";
import { ACTION } from "./actionTypes.ts";
import { JSONType } from "../types.ts";
import { formatDurationSeconds } from "../functions.ts";
import { Alert } from "@mui/material";

type HttpHeaders = {
  [key: string]: string;
};

interface APIResponse {
  status: number;
  headers: Response["headers"];
  json?: JSONType;
  body?: Response["body"];
}

interface APIFetchParams {
  json?: JSONType;
  headers?: HttpHeaders;
}

export class FetchError extends Error {
  cause: any;

  constructor(e: any) {
    super(`Error while fetching API: ${e}`);
    this.cause = e;
  }
}

export class HTTPError extends Error {
  status: number;
  headers: Response["headers"];
  errorMessage: string;
  json?: any;

  constructor(
    status: number,
    reason: string,
    headers: Response["headers"],
    errorMessage: string,
    json?: any,
  ) {
    super(`HTTP Error ${status} ${reason} : ${errorMessage}`);
    this.status = status;
    this.errorMessage = errorMessage;
    this.headers = headers;
    this.json = json;
  }
}

export class API {
  context: AppContextProps | null;
  dispatch: Dispatch<Action> | null;

  constructor() {
    this.context = null;
    this.dispatch = null;
  }

  prepareRequestInit(method: string, params?: APIFetchParams): RequestInit {
    const token = this.context?.token;

    const headers: HttpHeaders = {};
    const d: { method: string; body?: string; headers: HttpHeaders } = {
      method,
      headers,
    };

    if (token) {
      headers["Authorization"] = token;
    }

    if (params) {
      if (params.json) {
        d.body = JSON.stringify(params.json);
        headers["Content-Type"] = "application/json";
      }
      if (params.headers) {
        for (const [k, v] of Object.entries(params.headers)) {
          headers[k] = v;
        }
      }
    }
    return d;
  }

  async parseRequestResponse(response: Response): Promise<APIResponse> {
    let body, json;

    if (response.body) {
      body = response.body;
    }

    if (
      body &&
      response.headers.get("Content-Type")?.includes("application/json")
    ) {
      json = await response.json();
      body = undefined;
    }

    if (!response.ok) {
      throw new HTTPError(
        response.status,
        response.statusText,
        response.headers,
        body ? await response.text() : json?.explain || JSON.stringify(json),
        json,
      );
    }

    return { status: response.status, headers: response.headers, json, body };
  }

  handleUnexpectedError(error: any) {
    if (this.dispatch === null) {
      throw new Error("Cannot raise status if dispatch is null");
    }

    if (error instanceof FetchError) {
      this.dispatch({
        type: ACTION.DISPLAY_SNACKBAR,
        payload: (
          <Alert severity="error" variant="filled">
            Erreur de connexion au serveur : {error.cause.toString()}
          </Alert>
        ),
      });
      return;
    }
    if (error instanceof HTTPError) {
      if (error.status === 401) {
        this.dispatch({ type: ACTION.DISCONNECT });
        return;
      }
      if (error.status === 403) {
        this.dispatch({
          type: ACTION.DISPLAY_SNACKBAR,
          payload: (
            <Alert severity="error" variant="filled">
              Vous n'avez pas les droits nécessaires pour effectuer cette
              action.
            </Alert>
          ),
        });
        return;
      }
      if (error.status === 429) {
        const retryIn: number | null = error.json?.retry_after;
        const sentence = `Trop de requêtes, veuillez réessayer ${
          retryIn === null
            ? "plus tard"
            : `dans ${formatDurationSeconds(retryIn)}`
        }`;

        this.dispatch({
          type: ACTION.DISPLAY_SNACKBAR,
          payload: (
            <Alert severity="error" variant="filled">
              {sentence}
            </Alert>
          ),
        });
        return;
      }

      this.dispatch({
        type: ACTION.DISPLAY_SNACKBAR,
        payload: (
          <Alert severity="error" variant="filled">
            {error.message}
          </Alert>
        ),
      });
      return;
    }
    this.dispatch({
      type: ACTION.DISPLAY_SNACKBAR,
      payload: (
        <Alert severity="error" variant="filled">
          Erreur inconnue : {error.toString()}.
        </Alert>
      ),
    });
  }

  async fetchAPI(
    method: string,
    endpoint: string,
    params?: APIFetchParams,
  ): Promise<APIResponse> {
    const url = import.meta.env.VITE_APP_API_BASE + endpoint;
    const init = this.prepareRequestInit(method, params);

    let response;
    try {
      response = await window.fetch(url, init);
    } catch (e: any) {
      throw new FetchError(e);
    }
    return await this.parseRequestResponse(response);
  }
}
