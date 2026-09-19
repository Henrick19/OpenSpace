/** Shared loading message used while a page waits for API data. */
export function LoadingState({ message = "Loading…" }) {
  return <div className="feedback-state" role="status"><span className="spinner-border spinner-border-sm" /> {message}</div>;
}

/** Shared recoverable error message with an optional retry action. */
export function ErrorState({ message, onRetry }) {
  return (
    <div className="alert alert-danger d-flex justify-content-between align-items-center gap-3" role="alert">
      <span>{message}</span>
      {onRetry && <button className="btn btn-sm btn-outline-danger" onClick={onRetry}>Retry</button>}
    </div>
  );
}

/** Shared empty-result panel used when a list or dashboard has no records. */
export function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden="true">↑</div>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
