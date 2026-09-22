// Shared upload lifecycle values used by both the API and React application.
export const UPLOAD_STATUSES = [
  "staged",
  "uploading",
  "submitted",
  "processing",
  "completed",
  "failed",
  "cancelled",
];

// Dashboard records in these states as work currently in progress.
export const ACTIVE_UPLOAD_STATUSES = ["staged", "uploading", "submitted", "processing"];

// Uploads in these states no longer need frontend polling.
export const TERMINAL_UPLOAD_STATUSES = ["completed", "failed", "cancelled"];

// Default number of history rows returned when a page size is not supplied.
export const DEFAULT_PAGE_SIZE = 10;

// Human-readable labels keep status wording consistent across screens.
export const STATUS_LABELS = Object.freeze({
  staged: "Preparing",
  uploading: "Uploading",
  submitted: "Submitted",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
});
