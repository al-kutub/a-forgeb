/** Shared auth and API helpers for Forge UI. */

const TOKEN_KEY = "forge_token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = "/login.html";
    return false;
  }
  return true;
}

function redirectIfAuthed(target = "/profile.html") {
  if (getToken()) {
    window.location.href = target;
  }
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(path, { ...options, headers });
  let data = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await response.json();
  }
  return { ok: response.ok, status: response.status, data, response };
}

async function registerUser(email, password, displayName) {
  return api("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      display_name: displayName,
    }),
  });
}

async function loginUser(email, password) {
  return api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

async function fetchMe() {
  return api("/auth/me");
}

async function uploadAvatar(file) {
  const form = new FormData();
  form.append("file", file);
  return api("/users/me/avatar", { method: "PUT", body: form });
}

async function deleteAvatar() {
  return api("/users/me/avatar", { method: "DELETE" });
}

function showError(el, message) {
  if (!el) return;
  el.textContent = message || "";
  el.hidden = !message;
}

function avatarSrc(user) {
  if (user?.avatar_url) {
    return `${user.avatar_url}?t=${Date.now()}`;
  }
  if (user?.id) {
    return `/users/${user.id}/avatar?t=${Date.now()}`;
  }
  return "";
}
