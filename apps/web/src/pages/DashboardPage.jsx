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
import { PageHeading } from "../components/PageHeading.jsx";

const initialSummary = {
  totalUploads: 0,
  inProgress: 0,
  completed: 0,
  failed: 0,
  recentUploads: []
};


function MetricIcon({ type }) {
  if (type === "upload") {
    return (
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 16V4" />
        <path d="M7 9l5-5 5 5" />
        <path d="M5 20h14" />
      </svg>
    );
  }

  if (type === "clock") {
    return (
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v5l3 2" />
      </svg>
    );
  }

  if (type === "check") {
    return (
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 12l4 4 10-10" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </svg>
  );
}


function ReuseCard(card) {
  return (
    <div className={`metric-card ${card.colour}`}>
      <div className="metric-card-content">

        <div className="metric-icon">
          <MetricIcon type={card.icon} />
        </div>

        <div className="metric-text">
          <strong>{card.value}</strong>
          <span>{card.title}</span>
        </div>

      </div>
    </div>
  );
}


export function DashboardPage() {
  const navigate = useNavigate();

  const [selectedUpload, setSelectedUpload] = useState(null);

  const [requestCount, setRequestCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadSummary = useCallback(
    async () => {
      try {
        const latestSummary = await dashboardApi.getSummary();

        setLastUpdated(new Date());

        return latestSummary;
      } finally {
        setRefreshing(false);
      }
    },
    [requestCount]
  );

  const apiState = useApi(loadSummary, initialSummary);
  const summary = apiState.data;


  function handleRefresh() {
    setRefreshing(true);

    setRequestCount((count) => count + 1);
  }


  function handleRetry() {
    setRequestCount((count) => count + 1);
  }


  if (apiState.loading) {
    return <LoadingState message="Loading dashboard..." />;
  }


  if (apiState.error) {
    return (
      <ErrorState
        message={`Error loading dashboard: ${apiState.error}`}
        onRetry={handleRetry}
      />
    );
  }


  return (
    <div className="content-width">

      <PageHeading
        title="Dashboard"
        description="Upload activity from the local SQLite database."
        action={(
          <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate("/captures/new")}
          >
            + New upload
          </button>
        )}
      />


      {/* Refresh and Last Updated */}
      <div className="d-flex justify-content-end align-items-center gap-3 mb-3">

        <span className="text-muted small">
          {lastUpdated
            ? `Last updated ${lastUpdated.toLocaleTimeString()}`
            : "Not updated yet"}
        </span>

        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          disabled={refreshing}
          onClick={handleRefresh}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>

      </div>


      {/* Status Cards */}
      <div className="metric-grid">

        <ReuseCard
          title="Total Uploads"
          value={summary.totalUploads}
          colour="metric-blue"
          icon="upload"
        />

        <ReuseCard
          title="In Progress"
          value={summary.inProgress}
          colour="metric-amber"
          icon="clock"
        />

        <ReuseCard
          title="Completed"
          value={summary.completed}
          colour="metric-green"
          icon="check"
        />

        <ReuseCard
          title="Failed"
          value={summary.failed}
          colour="metric-red"
          icon="error"
        />

      </div>


      {/* Recent Uploads Heading */}
      <div className="section-card-heading">

        <h2>Recent Uploads</h2>

        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          onClick={() => navigate("/captures")}
        >
          View all uploads
        </button>

      </div>


      {/* Empty State */}
      {summary.recentUploads.length === 0 && (
        <EmptyState
          title="No recent uploads yet"
          description="Upload a capture to see recent activity here."
        />
      )}


      {/* Recent Uploads Table */}
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

                  <td>
                    {new Date(upload.capturedAt).toLocaleString()}
                  </td>

                  <td>
                    {upload.projectName} - {upload.floorName}
                  </td>

                  <td>
                    {upload.fileName}
                  </td>

                  <td>
                    <span
                      className={`status-badge status-${upload.status}`}
                    >
                      {STATUS_LABELS[upload.status]}
                    </span>
                  </td>

                  <td className="action-cell">

                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => setSelectedUpload(upload)}
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


      {/* Upload Details Popup */}
      {selectedUpload && (
        <>

          <div
            className="modal d-block"
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-details-title"
          >

            <div className="modal-dialog modal-dialog-centered">

              <div className="modal-content">


                <div className="modal-header">

                  <h2
                    className="modal-title h5"
                    id="upload-details-title"
                  >
                    Upload Details
                  </h2>

                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setSelectedUpload(null)}
                  />

                </div>


                <div className="modal-body">

                  <p>
                    <strong>Date / Time:</strong>{" "}
                    {new Date(
                      selectedUpload.capturedAt
                    ).toLocaleString()}
                  </p>

                  <p>
                    <strong>Project / Floor:</strong>{" "}
                    {selectedUpload.projectName} -{" "}
                    {selectedUpload.floorName}
                  </p>

                  <p>
                    <strong>File:</strong>{" "}
                    {selectedUpload.fileName}
                  </p>

                  <p>
                    <strong>Status:</strong>{" "}

                    <span
                      className={`status-badge status-${selectedUpload.status}`}
                    >
                      {STATUS_LABELS[selectedUpload.status]}
                    </span>

                  </p>

                </div>


                <div className="modal-footer">

                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setSelectedUpload(null)}
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() =>
                      navigate(
                        `/captures/${selectedUpload.id}/progress`
                      )
                    }
                  >
                    View Progress
                  </button>

                </div>


              </div>

            </div>

          </div>

          <div className="modal-backdrop show" />

        </>
      )}

    </div>
  );
}
