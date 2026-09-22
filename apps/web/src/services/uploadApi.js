import { apiRequest, toQueryString, uploadForm } from "./apiClient.js";

/**
 * Frontend gateway for creating, reading, filtering, retrying and cancelling
 * upload records. It communicates only with the PSB backend.
 */
export const uploadApi = {
  create(formData, onLocalProgress) {
    return uploadForm("/uploads", formData, onLocalProgress);
  },
  get(id) {
    return apiRequest(`/uploads/${id}`);
  },
  list(filters = {}) {
    return apiRequest(`/uploads${toQueryString(filters)}`);
  },
  retry(id) {
    return apiRequest(`/uploads/${id}/retry`, { method: "POST" });
  },
  cancel(id) {
    return apiRequest(`/uploads/${id}/cancel`, { method: "POST" });
  },
  remove(id) {
    return apiRequest(`/uploads/${id}`, { method: "DELETE" });
  },
};
