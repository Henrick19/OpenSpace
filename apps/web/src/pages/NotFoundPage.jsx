import { Link } from "react-router-dom";

import { EmptyState } from "../components/FeedbackState.jsx";

/** Fallback screen shown when no declared application route matches the URL. */
export function NotFoundPage() {
  return (
    <div className="content-width form-width">
      <EmptyState
        title="Page not found"
        description="The page may have moved, or the address may be incorrect."
        action={<Link className="btn btn-primary" to="/dashboard">Return to dashboard</Link>}
      />
    </div>
  );
}
