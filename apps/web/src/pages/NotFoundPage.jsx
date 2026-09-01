import { Link } from "react-router-dom";

export function NotFoundPage() {
  return <section><h1 className="h2">Page not found</h1><Link to="/dashboard">Return to dashboard</Link></section>;
}
