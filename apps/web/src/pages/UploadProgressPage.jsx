import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { captureApi } from "../services/captureApi.js";

const transferCompleteStatuses = new Set(["submitted", "processing", "ready"]);

function ProcessingState({ capture }) {
  if (capture.status === "ready") {
    return (
      <div className="alert alert-success mb-0">
        <strong>OpenSpace processing is complete.</strong>
        {capture.viewerUrl && <div className="mt-2"><a className="btn btn-success btn-sm" href={capture.viewerUrl} rel="noreferrer" target="_blank">Open viewer</a></div>}
      </div>
    );
  }

  if (capture.status === "failed") {
    return <div className="alert alert-danger mb-0"><strong>The capture job failed.</strong><div>{capture.errorMessage ?? "Review the local logs and retry."}</div></div>;
  }

  if (["submitted", "processing"].includes(capture.status)) {
    return (
      <div className="alert alert-info d-flex gap-3 align-items-start mb-0">
        <span className="spinner-border spinner-border-sm mt-1" aria-hidden="true" />
        <div>
          <strong>OpenSpace is processing the capture.</strong>
          <div>OpenSpace does not currently provide us with a reliable processing percentage, so this stage is intentionally shown without a numeric progress value.</div>
        </div>
      </div>
    );
  }

  if (["saved_locally", "waiting_for_internet"].includes(capture.status)) {
    return <div className="alert alert-warning mb-0"><strong>Saved locally.</strong> The OpenSpace submission will start when internet access and the live integration are available.</div>;
  }

  return <div className="alert alert-secondary mb-0">OpenSpace processing has not started yet.</div>;
}

export function UploadProgressPage() {
  const { captureId } = useParams();
  const [capture, setCapture] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await captureApi.get(captureId);
      setCapture(result);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [captureId]);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 15_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  if (loading) return <div className="d-flex align-items-center gap-2"><span className="spinner-border spinner-border-sm" /> Loading capture status…</div>;
  if (!capture) return <div className="alert alert-danger">{error || "Capture record is unavailable."}</div>;

  const uploadProgress = transferCompleteStatuses.has(capture.status) ? 100 : capture.uploadProgress;

  return (
    <section>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1 className="h2 mb-1">Capture progress</h1>
          <p className="text-secondary mb-0">{capture.captureName} · {capture.fileName}</p>
        </div>
        <button className="btn btn-outline-primary" onClick={refresh} type="button">Refresh status</button>
      </div>

      {error && <div className="alert alert-warning">The latest refresh failed: {error}</div>}

      <div className="card shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="d-flex justify-content-between mb-2"><strong>1. File transfer to OpenSpace</strong><span>{uploadProgress}%</span></div>
          <div className="progress" role="progressbar" aria-label="File transfer progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={uploadProgress}>
            <div className="progress-bar" style={{ width: `${uploadProgress}%` }}>{uploadProgress}%</div>
          </div>
          <p className="small text-secondary mt-2 mb-0">This percentage measures transferred file bytes. It does not represent OpenSpace cloud processing.</p>
        </div>
      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-body p-4">
          <h2 className="h5">2. OpenSpace processing</h2>
          <ProcessingState capture={capture} />
          <p className="small text-secondary mt-3 mb-0">Local status: <code>{capture.status}</code> · Last local update: {new Date(capture.updatedAt).toLocaleString("en-SG")}</p>
        </div>
      </div>

      <div className="d-flex gap-2">
        <Link className="btn btn-outline-secondary" to="/captures">View capture history</Link>
        <Link className="btn btn-primary" to="/captures/new">Create another capture</Link>
      </div>
    </section>
  );
}
