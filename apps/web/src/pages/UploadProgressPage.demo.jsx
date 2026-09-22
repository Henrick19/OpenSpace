import { useState } from "react";
import "../styles/upload-progress.css";

// TEMPORARY DEMO FILE — fake data only, no real API calls.
// Use this to visually check the uploading/failed/complete states
// before the real backend (Henrick's part) is ready.
// Delete this file once the real UploadProgressPage.jsx can be tested
// against live data.

const FAKE_RECORDS = {
  uploading: {
    fileName: "floor-3-east-wing.insv",
    project: "PSB HQ Retrofit",
    floor: "Level 3",
    fileSize: 482 * 1024 * 1024,
    status: "uploading",
    progress: { bytesSent: 210 * 1024 * 1024, totalBytes: 482 * 1024 * 1024 },
    viewerUrl: null,
    errorMessage: null,
  },
  failed: {
    fileName: "floor-3-east-wing.insv",
    project: "PSB HQ Retrofit",
    floor: "Level 3",
    fileSize: 482 * 1024 * 1024,
    status: "failed",
    progress: { bytesSent: 96 * 1024 * 1024, totalBytes: 482 * 1024 * 1024 },
    viewerUrl: null,
    errorMessage: "Connection lost while transferring the file.",
  },
  completed: {
    fileName: "floor-3-east-wing.insv",
    project: "PSB HQ Retrofit",
    floor: "Level 3",
    fileSize: 482 * 1024 * 1024,
    status: "completed",
    progress: { bytesSent: 482 * 1024 * 1024, totalBytes: 482 * 1024 * 1024 },
    viewerUrl: "https://www.openspace.ai/example-viewer-link",
    errorMessage: null,
  },
};

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

export function UploadProgressPageDemo() {
  const [scenario, setScenario] = useState("uploading");
  const record = FAKE_RECORDS[scenario];
  const { fileName, project, floor, fileSize, status, progress, viewerUrl, errorMessage } = record;

  const bytesSent = progress?.bytesSent;
  const totalBytes = progress?.totalBytes;
  const hasDeterminateProgress = typeof bytesSent === "number" && typeof totalBytes === "number";
  const percent = hasDeterminateProgress ? Math.round((bytesSent / totalBytes) * 100) : null;
  const activeStage = currentStageKey(status);
  const isFailed = status === "failed";
  const showCompleteModal = status === "completed";

  return (
    <section className="page-section upload-progress-page">
      <div className="demo-controls">
        <strong>Demo controls (fake data, remove before merging): </strong>
        <button type="button" onClick={() => setScenario("uploading")}>Uploading</button>{" "}
        <button type="button" onClick={() => setScenario("failed")}>Failed</button>{" "}
        <button type="button" onClick={() => setScenario("completed")}>Completed</button>
      </div>

      <h1>Uploading capture</h1>

      <dl className="upload-summary">
        <dt>File</dt>
        <dd>{fileName}</dd>
        <dt>Project</dt>
        <dd>{project}</dd>
        <dt>Floor</dt>
        <dd>{floor}</dd>
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
          <button type="button">Retry</button>
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
            <p>Waiting for transfer progress...</p>
          )}
        </div>
      )}

      {showCompleteModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="upload-complete-title">
          <div className="modal-content">
            <h2 id="upload-complete-title">Upload complete</h2>
            <p>The file transfer finished successfully. OpenSpace may still be processing the capture.</p>

            <dl className="upload-summary">
              <dt>File</dt>
              <dd>{fileName}</dd>
              <dt>Project</dt>
              <dd>{project}</dd>
              <dt>Floor</dt>
              <dd>{floor}</dd>
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
              <button type="button">Back to dashboard</button>
              <button type="button">View upload history</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}