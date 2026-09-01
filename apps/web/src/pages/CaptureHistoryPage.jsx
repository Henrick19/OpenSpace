import { useEffect, useState } from "react";

import { captureApi } from "../services/captureApi.js";

export function CaptureHistoryPage() {
  const [result, setResult] = useState({ items: [], total: 0 });
  const [error, setError] = useState("");

  useEffect(() => {
    captureApi.list({ page: 1, pageSize: 20 }).then(setResult).catch((requestError) => setError(requestError.message));
  }, []);

  return (
    <section>
      <h1 className="h2">Capture history</h1>
      <p className="text-secondary">Local upload records and OpenSpace processing status.</p>
      {error && <div className="alert alert-warning">{error}</div>}
      <div className="table-responsive bg-white border rounded-3">
        <table className="table table-hover align-middle mb-0">
          <thead><tr><th>Capture date/time</th><th>Project / floor</th><th>File</th><th>Status</th></tr></thead>
          <tbody>
            {result.items.length === 0 && <tr><td className="text-secondary text-center py-5" colSpan="4">No capture records yet.</td></tr>}
            {result.items.map((capture) => (
              <tr key={capture.id}>
                <td>{capture.capturedAt ?? "Not confirmed"}</td>
                <td>{capture.projectName}{capture.floorName ? ` / ${capture.floorName}` : ""}</td>
                <td>{capture.fileName}</td><td><span className="badge text-bg-secondary">{capture.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
