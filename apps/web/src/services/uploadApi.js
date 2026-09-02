import { apiRequest, toQueryString } from "./apiClient.js";

export const uploadApi = {
  create(uploadDetails) {
    return apiRequest("/uploads", { method: "POST", body: JSON.stringify(uploadDetails) });
  },
  get(uploadId) {
    return apiRequest(`/uploads/${uploadId}`);
  },
  list(filters = {}) {
    return apiRequest(`/uploads${toQueryString(filters)}`);
  },
  getRecent(limit = 5) {
    return apiRequest(`/uploads/recent${toQueryString({ limit })}`);
  },
  updateProgress(uploadId, progress) {
    return apiRequest(`/uploads/${uploadId}/progress`, {
      method: "PATCH",
      body: JSON.stringify({ progress }),
    });
  },
  retry(uploadId) {
    return apiRequest(`/uploads/${uploadId}/retry`, { method: "POST" });
  },
  markCompleted(uploadId, details = {}) {
    return apiRequest(`/uploads/${uploadId}/complete`, {
      method: "POST",
      body: JSON.stringify(details),
    });
  },
  markFailed(uploadId, errorMessage) {
    return apiRequest(`/uploads/${uploadId}/fail`, {
      method: "POST",
      body: JSON.stringify({ errorMessage }),
    });
  },
};
