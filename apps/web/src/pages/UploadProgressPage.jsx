import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { STATUS_LABELS } from "@openspace/shared";

import { ErrorState, LoadingState } from "../components/FeedbackState.jsx";
import { PageHeading } from "../components/PageHeading.jsx";
import { uploadApi } from "../services/uploadApi.js";
import { formatBytes } from "../utils/format.js";

const POLL_INTERVAL_MS = 3000;

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

/**
 * Maps a backend status to one of the three UI stages.
 * submitted / processing / completed all count as "OpenSpace processing" (stage 3)
 * once the file transfer itself has finished.
 */
function getStage(status) {
  if (status === "staged") return 1;
  if (status === "uploading") return 2;
  if (status === "submitted" || status === "processing" || status === "completed") return 3;
  return 1;
}

const STAGES = [
  { stage: 1, label: "Verified" },
  { stage: 2, label: "Uploading file" },
  { stage: 3, label: "OpenSpace processing" },
];

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

export function UploadProgressPage() {
  const { captureId } = useParams();
  const navigate = useNavigate();

  const [upload, setUpload] = useState(null);
  const [requestError, setRequestError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);

  const pollRef = useRef(null);

  const loadUpload = useCallback(async () => {
    try {
      const data = await uploadApi.get(captureId);
      setUpload(data);
      setRequestError(null);
      return data;
    } catch (err) {
      setRequestError(err.message ?? "Could not reach the OpenSpace API service.");
      return null;
    }
  }, [captureId]);

  // Initial load.
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setIsLoading(true);
      await loadUpload();
      if (isMounted) setIsLoading(false);
    })();
    return () => {
      isMounted = false;
    };
  }, [loadUpload]);

  // Poll only while the upload is active; stop on any terminal status.
  useEffect(() => {
    if (!upload || TERMINAL_STATUSES.has(upload.status)) {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return undefined;
    }

    pollRef.current = window.setInterval(loadUpload, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [upload?.status, loadUpload]);

  async function handleRetry() {
    setIsRetrying(true);
    try {
      await uploadApi.retry(captureId);
      await loadUpload();
    } catch (err) {
      setRequestError(err.message ?? "Retry failed.");
    } finally {
      setIsRetrying(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container-fluid py-2">
        <LoadingState message="Loading upload progress..." />
      </div>
    );
  }

  if (requestError && !upload) {
    return (
      <div className="container-fluid py-2">
        <ErrorState message={requestError} onRetry={loadUpload} />
      </div>
    );
  }

  if (!upload) {
    return (
      <div className="container-fluid py-2">
        <p className="text-muted">No upload record found for this capture.</p>
      </div>
    );
  }

  const {
    fileName,
    projectName,
    floorName,
    fileSize,
    status,
    uploadProgress,
    bytesSent,
    viewerUrl,
    errorMessage,
    pendingSeen,
  } = upload;

  const isFailed = status === "failed";
  const isTransferring = status === "uploading";
  const isPostTransfer = status === "submitted" || status === "processing";
  const isCompleted = status === "completed";
  const activeStage = getStage(status);

  return (
    <div className="container-fluid py-2">
      <PageHeading
        title={
          <span className="d-flex align-items-center gap-2 text-primary">
            <IconUploadCloud />
            Uploading capture
          </span>
        }
      />

      {/* File summary card */}
      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-6 col-md-3">
              <div className="text-uppercase text-muted small fw-semibold d-flex align-items-center gap-1">
                <IconFile className="text-primary" /> File
              </div>
              <div className="fw-medium">{fileName ?? "-"}</div>
            </div>
            <div className="col-6 col-md-3">
              <div className="text-uppercase text-muted small fw-semibold d-flex align-items-center gap-1">
                <IconBuilding className="text-primary" /> Project
              </div>
              <div className="fw-medium">{projectName ?? "-"}</div>
            </div>
            <div className="col-6 col-md-3">
              <div className="text-uppercase text-muted small fw-semibold d-flex align-items-center gap-1">
                <IconLayers className="text-primary" /> Floor
              </div>
              <div className="fw-medium">{floorName ?? "-"}</div>
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
        {STAGES.map(({ stage, label }, index) => {
          const isDone = stage < activeStage;
          const isActive = stage === activeStage;
          return (
            <div key={stage} className="d-flex flex-column align-items-center flex-fill position-relative">
              {index > 0 && (
                <div
                  className={`position-absolute top-0 start-0 translate-middle-y ${activeStage >= stage ? "bg-primary" : "bg-secondary-subtle"}`}
                  style={{ height: 2, width: "50%", marginTop: 20 }}
                />
              )}
              {index < STAGES.length - 1 && (
                <div
                  className={`position-absolute top-0 end-0 translate-middle-y ${activeStage > stage ? "bg-primary" : "bg-secondary-subtle"}`}
                  style={{ height: 2, width: "50%", marginTop: 20 }}
                />
              )}
              <span
                className={`d-flex align-items-center justify-content-center rounded-circle fw-bold ${
                  isActive || isDone ? "bg-primary text-white" : "bg-body-secondary text-muted"
                }`}
                style={{ width: 40, height: 40, zIndex: 1 }}
              >
                {isDone ? <IconCheckCircle /> : stage}
              </span>
              <span className={`small mt-2 fw-semibold text-center ${isActive ? "text-primary" : "text-muted"}`}>{label}</span>
            </div>
          );
        })}
      </div>

      {/* Status card */}
      {isFailed ? (
        <ErrorState message={errorMessage || "Upload failed."} onRetry={!isRetrying ? handleRetry : undefined} />
      ) : (
        <div className="card mb-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="badge text-bg-primary text-uppercase d-inline-flex align-items-center gap-1">
                <IconClock /> {STATUS_LABELS[status] ?? status}
              </span>
              {isTransferring && typeof uploadProgress === "number" && (
                <span className="text-muted small">{Math.round(uploadProgress)}%</span>
              )}
            </div>

            {isTransferring && (
              <>
                <div
                  className="progress"
                  role="progressbar"
                  aria-valuenow={uploadProgress}
                  aria-valuemin="0"
                  aria-valuemax="100"
                  style={{ height: 10 }}
                >
                  <div
                    className="progress-bar"
                    style={{ width: `${uploadProgress}%`, transition: "width 0.4s linear" }}
                  />
                </div>
                <div className="text-muted small mt-2">
                  {formatBytes(bytesSent)} of {formatBytes(fileSize)}
                </div>
              </>
            )}

            {isPostTransfer && !isCompleted && (
              <p className="text-muted mb-0">
                File transfer complete. OpenSpace is processing the capture.
                {pendingSeen && " The capture has been observed in pendingCaptures. Waiting for OpenSpace processing to finish."}
              </p>
            )}
          </div>
        </div>
      )}

      {requestError && upload && (
        <div className="alert alert-warning d-flex align-items-center gap-2" role="alert">
          <span>{requestError}</span>
        </div>
      )}

      {/* Completion modal */}
      {isCompleted && (
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
                  <p className="text-muted">OpenSpace processing has been confirmed as complete.</p>
                  <dl className="row mb-0">
                    <dt className="col-4 text-muted small text-uppercase d-flex align-items-center gap-1"><IconFile /> File</dt>
                    <dd className="col-8">{fileName ?? "-"}</dd>
                    <dt className="col-4 text-muted small text-uppercase d-flex align-items-center gap-1"><IconBuilding /> Project</dt>
                    <dd className="col-8">{projectName ?? "-"}</dd>
                    <dt className="col-4 text-muted small text-uppercase d-flex align-items-center gap-1"><IconLayers /> Floor</dt>
                    <dd className="col-8">{floorName ?? "-"}</dd>
                    <dt className="col-4 text-muted small text-uppercase d-flex align-items-center gap-1"><IconDatabase /> File size</dt>
                    <dd className="col-8">{formatBytes(fileSize)}</dd>
                    <dt className="col-4 text-muted small text-uppercase">Status</dt>
                    <dd className="col-8">
                      <span className="badge text-bg-success text-uppercase">{STATUS_LABELS[status]}</span>
                    </dd>
                  </dl>
                </div>
                <div className="modal-footer flex-wrap">
                  {viewerUrl && (
                    <a href={viewerUrl} target="_blank" rel="noreferrer" className="btn btn-primary d-inline-flex align-items-center gap-1">
                      <IconExternalLink /> Open in OpenSpace Singapore
                    </a>
                  )}
                  <button type="button" className="btn btn-outline-primary d-inline-flex align-items-center gap-1" onClick={() => navigate("/captures/new")}>
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