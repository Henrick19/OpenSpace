import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { uploadApi } from "../services/uploadApi.js";

const POLL_INTERVAL_MS = 2000;

const STAGES = [
  { key: "verified", label: "Verified" },
  { key: "uploading", label: "Uploading file" },
  { key: "complete", label: "Upload complete" },
];

function formatBytes(bytes) {
  if (bytes === undefined || bytes === null) return "—";
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

function currentStageKey(status) {
  if (status === "completed") return "complete";
  if (status === "uploading" || status === "retrying") return "uploading";
  return "verified";
}

export function UploadProgressPage() {
  const { captureId } = useParams();
  const navigate = useNavigate();

  const [record, setRecord] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const pollRef = useRef(null);

  const fetchRecord = useCallback(async () => {
    try {
      const data = await uploadApi.get(captureId);
      setRecord(data);
      setLoadError(null);
      if (data?.status === "completed") {
        setShowCompleteModal(true);
      }
      return data;
    } catch (err) {
      setLoadError(err.message ?? "Failed to load upload status.");
      return null;
    }
  }, [captureId]);

  useEffect(() => {
    let isMounted = true;

    async function initialLoad() {
      setIsLoading(true);
      const data = await fetchRecord();
      if (isMounted) setIsLoading(false);
      if (data && data.status !== "completed" && data.status !== "failed") {
        pollRef.current = setInterval(fetchRecord, POLL_INTERVAL_MS);
      }
    }

    initialLoad();

    return () => {
      isMounted = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchRecord]);

  // Stop polling once we reach a terminal state.
  useEffect(() => {
    if (record?.status === "completed" || record?.status === "failed") {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
  }, [record?.status]);

  async function handleRetry() {
    setIsRetrying(true);
    try {
      await uploadApi.retry(captureId);
      await fetchRecord();
      if (!pollRef.current) {
        pollRef.current = setInterval(fetchRecord, POLL_INTERVAL_MS);
      }
    } catch (err) {
      setLoadError(err.message ?? "Retry failed.");
    } finally {
      setIsRetrying(false);
    }
  }

  if (isLoading) {
    return (
      <section className="page-section" aria-busy="true">
        <p>Loading upload status…</p>
      </section>
    );
  }

  if (loadError && !record) {
    return (
      <section className="page-section">
        <p role="alert">Something went wrong: {loadError}</p>
        <button type="button" onClick={fetchRecord}>
          Retry
        </button>
      </section>
    );
  }

  if (!record) {
    return (
      <section className="page-section">
        <p>No upload record found for this capture.</p>
      </section>
    );
  }

  const { fileName, project, floor, fileSize, status, progress, viewerUrl, errorMessage } = record;
  const bytesSent = progress?.bytesSent;
  const totalBytes = progress?.totalBytes;
  const hasDeterminateProgress =
    typeof bytesSent === "number" && typeof totalBytes === "number" && totalBytes > 0;
  const percent = hasDeterminateProgress ? Math.round((bytesSent / totalBytes) * 100) : null;
  const activeStage = currentStageKey(status);
  const isFailed = status === "failed";

  return (
    <section className="page-section upload-progress-page">
      <h1>Uploading capture</h1>

      <dl className="upload-summary">
        <dt>File</dt>
        <dd>{fileName ?? "—"}</dd>
        <dt>Project</dt>
        <dd>{project ?? "—"}</dd>
        <dt>Floor</dt>
        <dd>{floor ?? "—"}</dd>
        <dt>File size</dt>
        <dd>{formatBytes(fileSize)}</dd>
      </dl>

      <ol className="upload-stages">
        {STAGES.map((stage) => (
          <li
            key={stage.key}
            className={stage.key === activeStage ? "stage stage-active" : "stage"}
            aria-current={stage.key === activeStage ? "step" : undefined}
          >
            {stage.label}
          </li>
        ))}
      </ol>

      {isFailed ? (
        <div className="upload-error" role="alert">
          <p>Upload failed{errorMessage ? `: ${errorMessage}` : "."}</p>
          <button type="button" onClick={handleRetry} disabled={isRetrying}>
            {isRetrying ? "Retrying…" : "Retry"}
          </button>
        </div>
      ) : (
        <div className="upload-progress-bar-wrap">
          {hasDeterminateProgress ? (
            <>
              <progress value={percent} max={100} aria-label="Upload progress" />
              <p>
                {formatBytes(bytesSent)} of {formatBytes(totalBytes)} ({percent}%)
              </p>
            </>
          ) : (
            <p>Waiting for transfer progress…</p>
          )}
        </div>
      )}

      {loadError && record && (
        <p role="alert" className="upload-warning">
          {loadError}
        </p>
      )}

      {showCompleteModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="upload-complete-title">
          <div className="modal-content">
            <h2 id="upload-complete-title">Upload complete</h2>
            <p>The file transfer finished successfully. OpenSpace may still be processing the capture.</p>

            <dl className="upload-summary">
              <dt>File</dt>
              <dd>{fileName ?? "—"}</dd>
              <dt>Project</dt>
              <dd>{project ?? "—"}</dd>
              <dt>Floor</dt>
              <dd>{floor ?? "—"}</dd>
              <dt>File size</dt>
              <dd>{formatBytes(fileSize)}</dd>
              <dt>Status</dt>
              <dd>{status}</dd>
            </dl>

            <div className="modal-actions">
              {viewerUrl && (
                <a href={viewerUrl} target="_blank" rel="noreferrer">
                  Open in OpenSpace Singapore
                </a>
              )}
              <button type="button" onClick={() => navigate("/dashboard")}>
                Back to dashboard
              </button>
              <button type="button" onClick={() => navigate("/captures")}>
                View upload history
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}