import { Dispatch } from "react";
import { Action, AppContextProps } from "./Context.ts";
import { ACTION } from "./actionTypes";
import { JSONType } from "../types.ts";

type HttpHeaders = {
  [key: string]: string;
};

interface APIResponse {
  status: number;
  json?: JSONType;
  text?: string;
}

interface APIFetchParams {
  json?: JSONType;
  headers?: HttpHeaders;
}

export class API {
  context: AppContextProps | null;
  dispatch: Dispatch<Action> | null;

  constructor() {
    this.context = null;
    this.dispatch = null;
  }

  raiseStatus(response: APIResponse): boolean {
    if (this.dispatch === null) {
      throw new Error("Cannot raise status if dispatch is null");
    }
    if (response.status === 401) {
      this.dispatch({ type: ACTION.DISCONNECT });
      return true;
    }
    return false;
  }

  async fetchAPI(
    method: string,
    endpoint: string,
    params?: APIFetchParams,
  ): Promise<APIResponse> {
    const token = this.context?.token;
    const url = import.meta.env.VITE_APP_API_BASE + endpoint;

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

    const response = await window.fetch(url, d);
    let text, json;
    if (response.status !== 204) {
      text = await response.text();
      try {
        json = JSON.parse(text);
      } catch (e) {
        console.trace(e);
      }
    }
    return { status: response.status, json: json, text: text };
  }

  async fetchAPIRaiseStatus(
    method: string,
    endpoint: string,
    params?: APIFetchParams,
  ): Promise<APIResponse | null> {
    let apiResponse;
    try {
      apiResponse = await this.fetchAPI(method, endpoint, params);
    } catch (e) {
      alert(e);
      return null;
    }

    if (this.raiseStatus(apiResponse)) {
      return null;
    }
    return apiResponse;
  }
}
