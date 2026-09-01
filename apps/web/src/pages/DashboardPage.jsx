import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { dashboardApi } from "../services/dashboardApi.js";

const emptySummary = { activeProjects: 0, totalCaptures: 0, processing: 0, ready: 0, failed: 0 };

export function DashboardPage() {
  const [summary, setSummary] = useState(emptySummary);
  const [error, setError] = useState("");

  useEffect(() => {
    dashboardApi.getSummary().then(setSummary).catch((requestError) => setError(requestError.message));
  }, []);

  const cards = [
    ["Active projects", summary.activeProjects],
    ["Total captures", summary.totalCaptures],
    ["Processing", summary.processing],
    ["Ready", summary.ready],
    ["Failed", summary.failed],
  ];

  return (
    <section>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div><h1 className="h2 mb-1">Dashboard</h1><p className="text-secondary mb-0">OpenSpace capture activity for the local MVP.</p></div>
        <Link className="btn btn-primary" to="/captures/new">+ New capture</Link>
      </div>
      {error && <div className="alert alert-warning">Local API unavailable: {error}</div>}
      <div className="row g-3">
        {cards.map(([label, value]) => (
          <div className="col-12 col-sm-6 col-xl" key={label}>
            <article className="card h-100 shadow-sm"><div className="card-body"><div className="display-6 fw-semibold">{value}</div><div className="text-secondary">{label}</div></div></article>
          </div>
        ))}
      </div>
    </section>
  );
}
