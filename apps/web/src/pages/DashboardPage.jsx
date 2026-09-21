import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardApi } from "../services/dashboardApi.js";
import { useApi } from "../hooks/useApi.js";
import { STATUS_LABELS } from "@openspace/shared";
import {
  LoadingState,
  ErrorState,
  EmptyState
} from "../components/FeedbackState.jsx";

const initialSummary = {
  totalUploads: 0,
  inProgress: 0,
  completed: 0,
  failed: 0,
  recentUploads: []
};


function ReuseCard(card) {
  return (
    <div className={`metric-card ${card.colour}`}>
      <strong>{card.value}</strong>
      <span>{card.title}</span>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();

  const [retryCount, setRetryCount] = useState(0);
  const loadSummary = useCallback(
    () => dashboardApi.getSummary(),
    [retryCount]
  );

  const apiState = useApi(loadSummary, initialSummary);
  const summary = apiState.data;

  if (apiState.loading) {
    return <LoadingState message="Loading dashboard..." />;
  }

  if (apiState.error) {
    return (
      <ErrorState
        message={`Error loading dashboard: ${apiState.error}`}
        onRetry={() => setRetryCount((count) => count + 1)}
      />
    );
  }
  return (
    <div className="content-width">

      <div className="page-heading">
        <div>
          <h1>Dashboard</h1>

          <p>
            Upload activity from the local SQLite database
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate("/captures/new")}
        >
          + New Upload
        </button>
      </div>

      <div className="metric-grid">
        <ReuseCard
          title="Total Uploads"
          value={summary.totalUploads}
          colour="metric-blue"
        />

        <ReuseCard
          title="In Progress"
          value={summary.inProgress}
          colour="metric-amber"
        />

        <ReuseCard
          title="Completed"
          value={summary.completed}
          colour="metric-green"
        />

        <ReuseCard
          title="Failed"
          value={summary.failed}
          colour="metric-red"
        />
      </div>

      <h2 className="h5 fw-semibold mb-3">
        Recent Uploads
      </h2>

      {summary.recentUploads.length === 0 && (
        <EmptyState
          title="No recent uploads yet"
          description="Upload a capture to see recent activity here."
        />
      )}

      {summary.recentUploads.length > 0 && (
        <div className="table-responsive">
          <table className="table data-table align-middle">
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Project / Floor</th>
                <th>File</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {summary.recentUploads.map((upload) => (
                <tr key={upload.id}>
                  <td>{new Date(upload.capturedAt).toLocaleString()}</td>

                  <td>
                    {upload.projectName} - {upload.floorName}
                  </td>

                  <td>{upload.fileName}</td>

                  <td>
                    <span className={`status-badge status-${upload.status}`}>
                      {STATUS_LABELS[upload.status]}
                    </span>
                  </td>

                  <td className="action-cell">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => navigate(`/captures/${upload.id}/progress`)}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}