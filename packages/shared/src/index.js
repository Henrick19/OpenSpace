// both the browser and API import these values so their lables and validation stay consistent

export const UPLOAD_STATUSES = [
  "staged",
  "uploading",
  "submitted",
  "processing",
  "completed",
  "failed",
  "canceled"
];

export const ACTIVE_UPLOAD_STATUSES = ["staged", "uploading", "submitted", "processing"];
export const DEFAULT_PAGE_SIZE = 10;

export const STATUS_LABELS = Object.freeze({
  staged: "Staged",
  uploading: "Uploading",
  submitted: "Submitted",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  canceled: "Canceled"
});