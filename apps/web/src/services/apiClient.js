// In local development, Vite proxies /api to the Node.js service on port 8787.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

/**
 * Sends a normal JSON-oriented request to the PSB backend and normalizes errors.
 * React pages should call feature services rather than this helper directly.
 */
export async function apiRequest(path, options = {}) {
  const headers = { Accept: "application/json", ...options.headers };
  if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  const body = response.status === 204
    ? null
    : contentType.includes("application/json")
      ? await response.json()
      : await response.text();
  if (!response.ok) throw new Error(body?.message || `Request failed with status ${response.status}.`);
  return body;
}

/**
 * Sends FormData with XMLHttpRequest so the New Upload page can display the
 * browser-to-backend transfer percentage.
 */
export function uploadForm(path, formData, onLocalProgress) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${API_BASE_URL}${path}`);
    request.responseType = "json";
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onLocalProgress?.(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) resolve(request.response);
      else reject(new Error(request.response?.message || `Request failed with status ${request.status}.`));
    });
    request.addEventListener("error", () => reject(new Error("Could not reach the local API service.")));
    request.send(formData);
  });
}

/** Converts defined filter values into a URL query string. */
export function toQueryString(filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
