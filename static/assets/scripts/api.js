APP_STATE = {};
API_BASE = "/api";

function getAnimationsByName(name) {
  return document.getAnimations().filter((a) => a.animationName === name);
}

function createDOM(obj) {
  const objType = typeof obj;
  if (objType === "string") {
    return document.createTextNode(obj);
  }

  const type = obj.type;
  const children = obj.children;
  const style = obj.style;
  delete obj.type, obj.children, obj.style;

  const element = document.createElement(type);
  for (const [key, value] of Object.entries(obj)) {
    element[key] = value;
  }
  if (style) {
    for (const [key, value] of Object.entries(style)) {
      element.style[key] = value;
    }
  }
  if (children) {
    for (const child of children) {
      if (child instanceof HTMLElement) {
        element.appendChild(child);
      } else {
        element.appendChild(createDOM(child));
      }
    }
  }
  return element;
}

class APIResponse {
  constructor(status, data) {
    this.status = status;
    this.data = data;
  }
}

async function fetchAPI(method, endpoint, params) {
  const url = API_BASE + endpoint;

  headers = {};
  d = { method };
  if (params) {
    if (params.json) {
      d["body"] = JSON.stringify(params.json);
      headers["Content-Type"] = "application/json";
    }
  }

  if (APP_STATE.token) {
    headers["Authorization"] = APP_STATE.token;
  }
  d.headers = headers;

  const response = await fetch(url, d);
  console.log(response);
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

function storeLogin(username, token) {
  localStorage.username = APP_STATE.username = username;
  localStorage.token = APP_STATE.token = token;
}

if (localStorage.username) {
  APP_STATE.username = localStorage.username;
}

if (localStorage.token) {
  APP_STATE.token = localStorage.token;
}
