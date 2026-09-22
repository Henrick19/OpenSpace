import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

// TEMPORARY DEMO FILE — fake data only, no real API calls.
// Uses real Bootstrap 5 classes (card, progress, badge, btn, modal) + inline SVG icons.
// The "Uploading" state now simulates progress moving over time for a more realistic preview.
// Delete this file once the real UploadProgressPage.jsx can be tested against live data.

const BASE_RECORDS = {
  uploading: {
    fileName: "floor-3-east-wing.insv",
    project: "PSB HQ Retrofit",
    floor: "Level 3",
    fileSize: 500 * 1024 * 1024,
    status: "uploading",
    viewerUrl: null,
    errorMessage: null,
  },
  failed: {
    fileName: "floor-3-east-wing.insv",
    project: "PSB HQ Retrofit",
    floor: "Level 3",
    fileSize: 500 * 1024 * 1024,
    status: "failed",
    progress: { bytesSent: 96 * 1024 * 1024, totalBytes: 500 * 1024 * 1024 },
    viewerUrl: null,
    errorMessage: "Connection lost while transferring the file.",
  },
  completed: {
    fileName: "floor-3-east-wing.insv",
    project: "PSB HQ Retrofit",
    floor: "Level 3",
    fileSize: 500 * 1024 * 1024,
    status: "completed",
    progress: { bytesSent: 500 * 1024 * 1024, totalBytes: 500 * 1024 * 1024 },
    viewerUrl: "https://www.openspace.ai/example-viewer-link",
    errorMessage: null,
  },
};

const TOTAL_BYTES = 500 * 1024 * 1024;
const SIMULATED_STEP_BYTES = TOTAL_BYTES * 0.04; // ~4% per tick
const SIMULATED_TICK_MS = 400;

function formatBytes(bytes) {
  if (bytes === undefined || bytes === null) return "-";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = -1;
  do {
    value /= 1024;
    unitIndex += 1;
  } while (value >= 1024 && unitIndex < units.length - 1);
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

const STAGES = [
  { key: "verified", label: "Verified" },
  { key: "uploading", label: "Uploading file" },
  { key: "complete", label: "Upload complete" },
];

function currentStageKey(status) {
  if (status === "completed") return "complete";
  if (status === "uploading" || status === "retrying") return "uploading";
  return "verified";
}

function statusBadgeVariant(status) {
  if (status === "completed") return "success";
  if (status === "failed") return "danger";
  return "primary";
}

/* --- Inline SVG icons (no extra dependency needed) --- */
function IconFile(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" {...props}>
      <path d="M4 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5.5L9.5 1H4zm5 1.5L11.5 5H9.5a.5.5 0 0 1-.5-.5V2.5z" />
    </svg>
  );
}
function IconBuilding(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" {...props}>
      <path d="M3 1a1 1 0 0 0-1 1v13h12V2a1 1 0 0 0-1-1H3zm1 2h2v2H4V3zm4 0h2v2H8V3zm-4 4h2v2H4V7zm4 0h2v2H8V7zm-4 4h2v3H4v-3zm4 0h2v3H8v-3z" />
    </svg>
  );
}
function IconLayers(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" {...props}>
      <path d="M8 0 .5 4 8 8l7.5-4L8 0zM.5 7.5 8 11.5l7.5-4M.5 11l7.5 4 7.5-4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}
function IconDatabase(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" {...props}>
      <ellipse cx="8" cy="3" rx="6" ry="2.2" />
      <path d="M2 3v4.2C2 8.4 4.7 9.4 8 9.4s6-1 6-2.2V3" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 7.4v4.2c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2V7.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
function IconCheckCircle(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" {...props}>
      <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.02L7.5 9.5 5.99 7.99a.75.75 0 0 0-1.06 1.06l2.02 2.02a.75.75 0 0 0 1.08-.02l4.06-4.75a.75.75 0 0 0-.06-1.36z" />
    </svg>
  );
}
function IconAlertTriangle(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" {...props}>
      <path d="M8.68 1.5c-.3-.5-1.06-.5-1.36 0L.34 13.5A.75.75 0 0 0 1 14.5h14a.75.75 0 0 0 .66-1L8.68 1.5zM8 5.5a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 5.5zm0 6.25a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8z" />
    </svg>
  );
}
function IconUploadCloud(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" {...props}>
      <path d="M4.5 12a3.5 3.5 0 0 1-.4-6.98A4.5 4.5 0 0 1 12.6 6.2 3.5 3.5 0 0 1 12 12H4.5z" opacity="0.35" />
      <path d="M8 5.5a.5.5 0 0 1 .5.5v4.29l1.15-1.15a.5.5 0 0 1 .7.7l-2 2a.5.5 0 0 1-.7 0l-2-2a.5.5 0 1 1 .7-.7L7.5 10.3V6a.5.5 0 0 1 .5-.5z" transform="rotate(180 8 8)" />
    </svg>
  );
}
function IconExternalLink(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" {...props}>
      <path d="M8.5 1a.5.5 0 0 0 0 1h4.29L6.15 8.65a.5.5 0 0 0 .7.7L13.5 2.7V7a.5.5 0 0 0 1 0V1.5a.5.5 0 0 0-.5-.5H8.5z" />
      <path d="M2 3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V8.5a.5.5 0 0 0-1 0V13H2V4h4.5a.5.5 0 0 0 0-1H2z" />
    </svg>
  );
}
function IconHome(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" {...props}>
      <path d="M8 1 1 7v8h5V10h4v5h5V7L8 1z" />
    </svg>
  );
}
function IconClock(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" {...props}>
      <path d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm.5-11a.5.5 0 0 0-1 0v4.3l3 1.8a.5.5 0 0 0 .5-.86L8.5 8.7V4z" />
    </svg>
  );
}

export function UploadProgressPageDemo() {
  const navigate = useNavigate();
  const [scenario, setScenario] = useState("uploading");
  const [simulatedBytesSent, setSimulatedBytesSent] = useState(0);
  const intervalRef = useRef(null);

  // Simulate the progress bar climbing while in the "uploading" scenario.
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (scenario !== "uploading") return undefined;

    setSimulatedBytesSent(0);
    intervalRef.current = setInterval(() => {
      setSimulatedBytesSent((prev) => {
        const next = prev + SIMULATED_STEP_BYTES;
        if (next >= TOTAL_BYTES) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          // Give the bar a beat to visually reach 100% before switching states.
          setTimeout(() => setScenario("completed"), 350);
          return TOTAL_BYTES;
        }
        return next;
      });
    }, SIMULATED_TICK_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [scenario]);

  const base = BASE_RECORDS[scenario];
  const record =
    scenario === "uploading"
      ? { ...base, progress: { bytesSent: simulatedBytesSent, totalBytes: TOTAL_BYTES } }
      : base;

  const { fileName, project, floor, fileSize, status, progress, viewerUrl, errorMessage } = record;

  const bytesSent = progress?.bytesSent;
  const totalBytes = progress?.totalBytes;
  const hasDeterminateProgress = typeof bytesSent === "number" && typeof totalBytes === "number";
  const percent = hasDeterminateProgress ? Math.min(100, Math.round((bytesSent / totalBytes) * 100)) : null;
  const activeStageIndex = STAGES.findIndex((s) => s.key === currentStageKey(status));
  const isFailed = status === "failed";
  const showCompleteModal = status === "completed";

  return (
    <div className="container-fluid py-2">
      {/* Demo controls */}
      <div className="alert alert-warning d-flex align-items-center gap-2 flex-wrap mb-4" role="alert">
        <strong className="me-2">Demo controls (fake data, remove before merging):</strong>
        <div className="btn-group btn-group-sm" role="group">
          <button type="button" className={`btn btn-outline-primary ${scenario === "uploading" ? "active" : ""}`} onClick={() => setScenario("uploading")}>
            Uploading
          </button>
          <button type="button" className={`btn btn-outline-primary ${scenario === "failed" ? "active" : ""}`} onClick={() => setScenario("failed")}>
            Failed
          </button>
          <button type="button" className={`btn btn-outline-primary ${scenario === "completed" ? "active" : ""}`} onClick={() => setScenario("completed")}>
            Completed
          </button>
        </div>
      </div>

      <h1 className="h3 mb-4 text-primary fw-bold d-flex align-items-center gap-2">
        <IconUploadCloud />
        Uploading capture
      </h1>

      {/* File summary card */}
      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-6 col-md-3">
              <div className="text-uppercase text-muted small fw-semibold d-flex align-items-center gap-1">
                <IconFile className="text-primary" /> File
              </div>
              <div className="fw-medium">{fileName}</div>
            </div>
            <div className="col-6 col-md-3">
              <div className="text-uppercase text-muted small fw-semibold d-flex align-items-center gap-1">
                <IconBuilding className="text-primary" /> Project
              </div>
              <div className="fw-medium">{project}</div>
            </div>
            <div className="col-6 col-md-3">
              <div className="text-uppercase text-muted small fw-semibold d-flex align-items-center gap-1">
                <IconLayers className="text-primary" /> Floor
              </div>
              <div className="fw-medium">{floor}</div>
            </div>
            <div className="col-6 col-md-3">
              <div className="text-uppercase text-muted small fw-semibold d-flex align-items-center gap-1">
                <IconDatabase className="text-primary" /> File size
              </div>
              <div className="fw-medium">{formatBytes(fileSize)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stage tracker */}
      <div className="d-flex justify-content-between align-items-center mb-4 px-2">
        {STAGES.map((stage, index) => {
          const isDone = index < activeStageIndex;
          const isActive = index === activeStageIndex;
          return (
            <div key={stage.key} className="d-flex flex-column align-items-center flex-fill position-relative">
              {index > 0 && (
                <div
                  className={`position-absolute top-0 start-0 translate-middle-y ${activeStageIndex >= index ? "bg-primary" : "bg-secondary-subtle"}`}
                  style={{ height: 2, width: "50%", marginTop: 20 }}
                />
              )}
              {index < STAGES.length - 1 && (
                <div
                  className={`position-absolute top-0 end-0 translate-middle-y ${activeStageIndex > index ? "bg-primary" : "bg-secondary-subtle"}`}
                  style={{ height: 2, width: "50%", marginTop: 20 }}
                />
              )}
              <span
                className={`d-flex align-items-center justify-content-center rounded-circle fw-bold ${
                  isActive || isDone ? "bg-primary text-white" : "bg-body-secondary text-muted"
                }`}
                style={{ width: 40, height: 40, zIndex: 1 }}
              >
                {isDone ? <IconCheckCircle /> : index + 1}
              </span>
              <span className={`small mt-2 fw-semibold ${isActive ? "text-primary" : "text-muted"}`}>{stage.label}</span>
            </div>
          );
        })}
      </div>

      {/* Status + progress / error */}
      {isFailed ? (
        <div className="card border-danger mb-4">
          <div className="card-body">
            <div className="d-flex align-items-center gap-2 mb-3">
              <IconAlertTriangle className="text-danger" />
              <span className="badge text-bg-danger">Failed</span>
              <span className="text-danger">{errorMessage}</span>
            </div>
            <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setScenario("uploading")}>
              Retry
            </button>
          </div>
        </div>
      ) : (
        <div className="card mb-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className={`badge text-bg-${statusBadgeVariant(status)} text-uppercase d-inline-flex align-items-center gap-1`}>
                <IconClock /> {status}
              </span>
              {hasDeterminateProgress && <span className="text-muted small">{percent}%</span>}
            </div>
            {hasDeterminateProgress ? (
              <>
                <div className="progress" role="progressbar" aria-valuenow={percent} aria-valuemin="0" aria-valuemax="100" style={{ height: 10 }}>
                  <div
                    className="progress-bar"
                    style={{ width: `${percent}%`, transition: "width 0.4s linear" }}
                  />
                </div>
                <div className="text-muted small mt-2">
                  {formatBytes(bytesSent)} of {formatBytes(totalBytes)}
                </div>
              </>
            ) : (
              <p className="text-muted mb-0">Waiting for transfer progress...</p>
            )}
          </div>
        </div>
      )}

      {/* Completion modal */}
      {showCompleteModal && (
        <>
          <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="upload-complete-title">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h2 className="modal-title h5 text-primary d-flex align-items-center gap-2" id="upload-complete-title">
                    <IconCheckCircle className="text-success" />
                    Upload complete
                  </h2>
                </div>
                <div className="modal-body">
                  <p className="text-muted">
                    The file transfer finished successfully. OpenSpace may still be processing the capture.
                  </p>
                  <dl className="row mb-0">
                    <dt className="col-4 text-muted small text-uppercase d-flex align-items-center gap-1"><IconFile /> File</dt>
                    <dd className="col-8">{fileName}</dd>
                    <dt className="col-4 text-muted small text-uppercase d-flex align-items-center gap-1"><IconBuilding /> Project</dt>
                    <dd className="col-8">{project}</dd>
                    <dt className="col-4 text-muted small text-uppercase d-flex align-items-center gap-1"><IconLayers /> Floor</dt>
                    <dd className="col-8">{floor}</dd>
                    <dt className="col-4 text-muted small text-uppercase d-flex align-items-center gap-1"><IconDatabase /> File size</dt>
                    <dd className="col-8">{formatBytes(fileSize)}</dd>
                    <dt className="col-4 text-muted small text-uppercase">Status</dt>
                    <dd className="col-8">
                      <span className="badge text-bg-success text-uppercase">{status}</span>
                    </dd>
                  </dl>
                </div>
                <div className="modal-footer flex-wrap">
                  {viewerUrl && (
                    <a href={viewerUrl} target="_blank" rel="noreferrer" className="btn btn-primary d-inline-flex align-items-center gap-1">
                      <IconExternalLink /> Open in OpenSpace Singapore
                    </a>
                  )}
                  <button type="button" className="btn btn-outline-primary d-inline-flex align-items-center gap-1" onClick={() => setScenario("uploading")}>
                    <IconUploadCloud /> Upload again
                  </button>
                  <button type="button" className="btn btn-outline-secondary d-inline-flex align-items-center gap-1" onClick={() => navigate("/dashboard")}>
                    <IconHome /> Back to dashboard
                  </button>
                  <button type="button" className="btn btn-outline-secondary d-inline-flex align-items-center gap-1" onClick={() => navigate("/captures")}>
                    <IconLayers /> View upload history
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