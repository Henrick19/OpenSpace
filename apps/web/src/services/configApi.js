import { apiRequest } from "./apiClient.js";

/** Backend configuration needed by the UI; no secret values are returned. */
export const configApi = {
  get() {
    return apiRequest("/config");
  },
};
