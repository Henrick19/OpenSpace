import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ErrorState, LoadingState } from "../components/FeedbackState.jsx";
import { PageHeading } from "../components/PageHeading.jsx";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { UploadCompleteModal } from "../components/UploadCompleteModal.jsx";
import { uploadApi } from "../services/uploadApi.js";
import { formatBytes, formatDateTime } from "../utils/format.js";

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

/** Polls the local backend; the browser never calls OpenSpace directly. */
export function UploadProgressPage() {
  const { captureId } = useParams();
  const navigate = useNavigate();
  const [upload, setUpload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalDismissed, setModalDismissed] = useState(false);

  const load = useCallback(async () => {
    try {
      setUpload(await uploadApi.get(captureId));
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [captureId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!upload || TERMINAL_STATUSES.has(upload.status)) return undefined;
    const timer = window.setInterval(load, 2000);
    return () => window.clearInterval(timer);
  }, [upload, load]);

  const stage = useMemo(() => {
    if (!upload) return 1;
    if (["submitted", "processing", "completed"].includes(upload.status)) return 3;
    if (["uploading", "failed", "cancelled"].includes(upload.status)) return 2;
    return 1;
  }, [upload]);

  async function retry() {
    setError("");
    setModalDismissed(false);
    try {
      setUpload(await uploadApi.retry(captureId));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function cancel() {
    if (!window.confirm("Cancel this upload? The local file will be retained when possible for retry.")) return;
    setError("");
    try {
      setUpload(await uploadApi.cancel(captureId));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (loading) return <LoadingState message="Loading upload progress…" />;
  if (error && !upload) return <ErrorState message={error} onRetry={load} />;
  if (!upload) return null;

  const isTransferring = ["staged", "uploading"].includes(upload.status);
  const isProcessing = ["submitted", "processing"].includes(upload.status);
  const retryLabel = upload.localFileDeleted ? "Retry status check" : "Retry upload";

  return (
    <div className="content-width form-width">
      <PageHeading
        title={isProcessing ? "OpenSpace processing" : upload.status === "completed" ? "Upload completed" : "Uploading INSV file"}
        description="Status is read from the local Node.js service and stored in SQLite."
      />
      {error && <ErrorState message={error} onRetry={load} />}

      <section className="upload-summary">
        <div><span>File</span><strong>{upload.fileName}</strong></div>
        <div><span>Project</span><strong>{upload.projectName}</strong></div>
        <div><span>Floor</span><strong>{upload.floorName}</strong></div>
        <div><span>Size</span><strong>{formatBytes(upload.fileSize)}</strong></div>
      </section>

      <ol className="stepper" aria-label="Upload stages">
        <li className={stage >= 1 ? "active" : ""}><span>1</span><strong>Verified locally</strong></li>
        <li className={stage >= 2 ? "active" : ""}><span>2</span><strong>File transfer</strong></li>
        <li className={stage >= 3 ? "active" : ""}><span>3</span><strong>OpenSpace processing</strong></li>
      </ol>

      <section className="section-card progress-card">
        <div className="d-flex justify-content-between align-items-start gap-3">
          <div>
            <h2>{isProcessing ? "Waiting for OpenSpace" : upload.status === "completed" ? "Processing confirmed" : "Secure file transfer"}</h2>
            <p>{upload.captureName}</p>
          </div>
          <StatusBadge status={upload.status} />
        </div>

        {isProcessing ? (
          <div className="processing-state">
            <span className="spinner-border" aria-hidden="true" />
            <div>
              <strong>File transfer complete</strong>
              <p>{upload.pendingSeen ? "The capture has been observed in pendingCaptures. Waiting for it to disappear." : "Waiting for OpenSpace to register the capture as pending."}</p>
            </div>
          </div>
        ) : upload.status === "completed" ? (
          <div className="completion-state"><span aria-hidden="true">✓</span><div><strong>Processing complete</strong><p>Confirmed {formatDateTime(upload.processingCompletedAt)}.</p></div></div>
        ) : (
          <>
            <div className="progress progress-large" aria-label={`${upload.uploadProgress}% uploaded`}>
              <div className="progress-bar" style={{ width: `${upload.uploadProgress}%` }}>{upload.uploadProgress}%</div>
            </div>
            <div className="progress-meta"><span>{formatBytes(upload.bytesSent)} of {formatBytes(upload.fileSize)} transferred</span><span>Single-part upload</span></div>
          </>
        )}

        {upload.errorMessage && <div className="alert alert-danger mt-4 mb-0">{upload.errorMessage}</div>}
        <div className="progress-actions">
          {isTransferring && <button className="btn btn-outline-danger" onClick={cancel}>Cancel upload</button>}
          {["failed", "cancelled"].includes(upload.status) && <button className="btn btn-primary" onClick={retry}>{retryLabel}</button>}
          {upload.status === "completed" && upload.viewerUrl && <a className="btn btn-primary" href={upload.viewerUrl} target="_blank" rel="noreferrer">Open OpenSpace Singapore</a>}
          <button className="btn btn-outline-secondary" onClick={() => navigate("/captures")}>View upload history</button>
        </div>
      </section>

      <p className="technical-note">
        The percentage measures only bytes sent from the Node.js uploader to OpenSpace. The private integration does not provide an OpenSpace processing percentage.
      </p>
      <UploadCompleteModal show={upload.status === "completed" && !modalDismissed} upload={upload} onClose={() => setModalDismissed(true)} />
    </div>
  );
}
