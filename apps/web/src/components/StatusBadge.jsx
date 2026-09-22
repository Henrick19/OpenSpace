import { STATUS_LABELS } from "@openspace/shared";

/** Displays one upload lifecycle value using consistent shared wording. */
export function StatusBadge({ status }) {
  return (
    <span className={`status-badge status-${status}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
