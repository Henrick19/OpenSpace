import { apiRequest, toQueryString } from "./apiClient.js";

export const captureApi = {
  create(captureDetails) {
    return apiRequest("/captures", { method: "POST", body: JSON.stringify(captureDetails) });
  },
  get(captureId) {
    return apiRequest(`/captures/${captureId}`);
  },
  list(filters) {
    return apiRequest(`/captures${toQueryString(filters)}`);
  },
};
