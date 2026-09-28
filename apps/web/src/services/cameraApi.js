import { apiRequest } from "./apiClient.js";

/** Local physical-camera catalogue used by the New Upload dropdown. */
export const cameraApi = {
  async list() {
    const result = await apiRequest("/cameras");
    return result.items;
  },
  create(camera) {
    return apiRequest("/cameras", {
      method: "POST",
      body: JSON.stringify(camera),
    });
  },
  update(currentDeviceId, camera) {
    return apiRequest(`/cameras/${encodeURIComponent(currentDeviceId)}`, {
      method: "PATCH",
      body: JSON.stringify(camera),
    });
  },
};
