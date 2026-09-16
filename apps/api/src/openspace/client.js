import fs from "node:fs";
import { Transform } from "node:stream";

// Convert OpenSpace error bodies into one consistent message for the coordinator.
function messageFromResponse(status, body) {
  const message = body?.message || body?.error_description || body?.error;
  return message ? `OpenSpace request failed (${status}): ${message}` : `OpenSpace request failed (${status}).`;
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (response.status === 204) return null;
  if (contentType.includes("application/json")) return response.json();
  const text = await response.text();
  return text ? { text } : null;
}

/**
 * Creates the server-side client for the private OpenSpace capture-upload flow.
 * Credentials and access tokens remain inside the Node.js process.
 *
 * @param {object} config Normalized OpenSpace environment configuration.
 */
export function createOpenSpaceClient(config) {
  // Reuse valid tokens while refreshing shortly before expiry.
  let tokenCache = null;

  async function getAccessToken() {
    if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;
    const form = new URLSearchParams({
      grant_type: "password",
      audience: "openspace.ai",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      username: config.username,
      password: config.password,
    });
    const response = await fetch(config.authUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const body = await parseResponse(response);
    if (!response.ok) throw new Error(messageFromResponse(response.status, body));
    tokenCache = {
      token: body.access_token,
      expiresAt: Date.now() + Math.max((body.expires_in || 3600) - 60, 60) * 1000,
    };
    return tokenCache.token;
  }

  async function request(path, options = {}) {
    const token = await getAccessToken();
    const response = await fetch(`${config.baseUrl}${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, ...options.headers },
    });
    const body = await parseResponse(response);
    if (!response.ok) throw new Error(messageFromResponse(response.status, body));
    return body;
  }

  // Convenience wrapper for the JSON POST requests used by the workflow.
  function postJson(path, body) {
    return request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function createCapture(upload, captureId) {
    return postJson(`/api/upcap/site/${encodeURIComponent(upload.siteId)}/upcap-session`, {
      id: captureId,
      sheetId: upload.sheetId,
      captureName: upload.captureName,
      startMicro: upload.startMicro,
      startPosition: upload.startPosition,
      deviceId: upload.deviceId,
      deviceState: { timezoneOffsetMinutes: -new Date(upload.capturedAt).getTimezoneOffset() },
    });
  }

  async function attachMetadata(upload, captureId, uploadId) {
    return postJson(
      `/api/upcap/site/${encodeURIComponent(upload.siteId)}/session/${encodeURIComponent(captureId)}/match`,
      {
        startMicro: upload.startMicro,
        files: [{
          deviceId: upload.deviceId,
          deviceUrl: upload.fileName,
          file: { id: uploadId },
        }],
      },
    );
  }

  async function registerUpload(upload, uploadId) {
    return postJson(`/api/site/${encodeURIComponent(upload.siteId)}/upcap/uploads`, {
      deviceId: upload.deviceId,
      deviceFilename: upload.fileName,
      tags: ["manual"],
      contentType: "video/insv",
      size: upload.fileSize,
      numParts: 1,
      uploadId,
    });
  }

  async function uploadFile(upload, uploadId, { signal, onProgress }) {
    let bytesSent = 0;
    let lastReportedAt = 0;
    // Count bytes while streaming; do not load the large INSV file into memory.
    const progress = new Transform({
      transform(chunk, _encoding, callback) {
        bytesSent += chunk.length;
        const now = Date.now();
        if (now - lastReportedAt >= 250 || bytesSent === upload.fileSize) {
          lastReportedAt = now;
          onProgress?.(bytesSent);
        }
        callback(null, chunk);
      },
    });
    const stream = fs.createReadStream(upload.localFilePath).pipe(progress);
    await request(
      `/api/site/${encodeURIComponent(upload.siteId)}/upcap/uploads/${encodeURIComponent(uploadId)}?partNum=1`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "video/insv",
          "Content-Length": String(upload.fileSize),
          "Content-Range": `0-${upload.fileSize - 1}/${upload.fileSize}`,
        },
        body: stream,
        duplex: "half",
        signal,
      },
    );
    onProgress?.(upload.fileSize);
  }

  async function getPendingCaptures(siteId) {
    // layout2 is intentionally limited to the documented pendingCaptures check.
    const layout = await request(`/api/site/${encodeURIComponent(siteId)}/layout2?full=true`);
    return Array.isArray(layout?.pendingCaptures) ? layout.pendingCaptures : [];
  }

  return { attachMetadata, createCapture, getPendingCaptures, registerUpload, uploadFile };
}
