// src/services/api.js
// ─────────────────────────────────────────────────────────────
//  Centralised API layer — all calls to the Django backend
//  Base URL reads from .env (VITE_API_URL) or falls back to localhost.
// ─────────────────────────────────────────────────────────────

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

function getCsrfToken() {
  return document.cookie
    .split("; ")
    .find((item) => item.startsWith("csrftoken="))
    ?.split("=")[1] || "";
}

async function request(method, path, body) {
  const csrfToken = getCsrfToken();
  const opts = {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg =
      Object.values(err).flat().join(" ") ||
      `Request failed: ${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  // 204 No Content / 200 with empty body
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── Leather Types ─────────────────────────────────────────────
export const leatherAPI = {
  list:   ()          => request("GET",    "/leather-types/"),
  create: (data)      => request("POST",   "/leather-types/",      data),
  update: (id, data)  => request("PATCH",  `/leather-types/${id}/`, data),
  remove: (id)        => request("DELETE", `/leather-types/${id}/`),
};

// ── Size Types ────────────────────────────────────────────────
export const sizeAPI = {
  list:   ()          => request("GET",    "/size-types/"),
  create: (data)      => request("POST",   "/size-types/",          data),
  update: (id, data)  => request("PATCH",  `/size-types/${id}/`,    data),
  remove: (id)        => request("DELETE", `/size-types/${id}/`),
};

// ── Transactions ──────────────────────────────────────────────
export const transactionAPI = {
  list:   ()          => request("GET",    "/transactions/"),
  create: (data)      => request("POST",   "/transactions/",        data),
  update: (id, data)  => request("PATCH",  `/transactions/${id}/`,  data),
  remove: (id)        => request("DELETE", `/transactions/${id}/`),
};