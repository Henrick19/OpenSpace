import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ErrorState, LoadingState } from "../components/FeedbackState.jsx";
import { PageHeading } from "../components/PageHeading.jsx";
import { configApi } from "../services/configApi.js";
import { projectApi } from "../services/projectApi.js";
import { uploadApi } from "../services/uploadApi.js";
import {
  captureDateTimeFromFileName,
  formatBytes,
  toLocalDateTimeInput,
} from "../utils/format.js";

/** Validates capture metadata and sends one INSV file to the local Node.js API. */

export function NewCapturePage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [mode, setMode] = useState("mock");
  const [maximumUploadBytes, setMaximumUploadBytes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const [captureTimeDetected, setCaptureTimeDetected] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    siteId: "",
    sheetId: "",
    captureName: "",
    deviceId: "",
    capturedAt: toLocalDateTimeInput(),
    file: null,
  });

  useEffect(() => {
    Promise.all([projectApi.list(), configApi.get()])
      .then(([projectItems, config]) => {
        setProjects(projectItems);
        setMode(config.openSpaceMode);
        setMaximumUploadBytes(config.maximumUploadBytes);
        const firstAvailable = projectItems.find(
          (project) => project.canUpload,
        );
        setForm((current) => ({
          ...current,
          siteId: firstAvailable?.siteId ?? "",
          sheetId: firstAvailable?.sheets[0]?.sheetId ?? "",
          deviceId: config.defaultDeviceId ?? "",
        }));
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  const selectedProject = useMemo(
    () => projects.find((project) => project.siteId === form.siteId),
    [projects, form.siteId],
  );

  function updateField(event) {
    // What input changed?
    const { name, value, files } = event.target;

    // Special case: project changed
    if (name === "siteId") {
      // Find that project
      const project = projects.find((item) => item.siteId === value);

      // Change project and automatically
      // select its first sheet
      setForm((current) => ({
        ...current,
        siteId: value,
        sheetId: project?.sheets[0]?.sheetId ?? "",
      }));

      return;
    }

    if (name === "file") {
      const file = files?.[0] ?? null;
      const detectedDateTime = file
        ? captureDateTimeFromFileName(file.name)
        : null;

      setCaptureTimeDetected(Boolean(detectedDateTime));
      setForm((current) => ({
        ...current,
        file,
        capturedAt: detectedDateTime ?? current.capturedAt,
      }));
      return;
    }

    if (name === "capturedAt") setCaptureTimeDetected(false);

    // Everything else:
    // normal input → store value
    // file input   → store first file
    setForm((current) => ({
      ...current,
      [name]: files ? (files[0] ?? null) : value,
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!selectedProject?.canUpload) {
      setError("The selected project has no configured floor sheet.");
      return;
    }
    if (!form.file || !form.file.name.toLowerCase().endsWith(".insv")) {
      setError("Select one INSV capture file.");
      return;
    }
    if (maximumUploadBytes && form.file.size > maximumUploadBytes) {
      setError(
        `The selected file exceeds the local ${formatBytes(maximumUploadBytes)} size limit.`,
      );
      return;
    }
    setSubmitting(true);
    setLocalProgress(0);
    try {
      const data = new FormData();
      data.append("siteId", form.siteId);
      data.append("sheetId", form.sheetId);
      data.append("captureName", form.captureName);
      data.append("deviceId", form.deviceId);
      data.append("capturedAt", new Date(form.capturedAt).toISOString());
      data.append("file", form.file);
      const upload = await uploadApi.create(data, setLocalProgress);
      navigate(`/captures/${upload.id}/progress`);
    } catch (requestError) {
      setError(requestError.message);
      setSubmitting(false);
    }
  }

  if (loading)
    return <LoadingState message="Loading project and floor information…" />;

  return (
    <div className="content-width form-width new-upload-page">
      <PageHeading
        title="Create new upload"
        description="Prepare and submit one Insta360 capture through the secure local backend."
        action={<button type="button" className="btn btn-primary" onClick={() => navigate("/catalogue")}>Manage projects</button>}
      />
      <div className="mode-notice">
        <span className={`mode-dot mode-${mode}`} aria-hidden="true" />
        <div><strong>{mode === "live" ? "Live OpenSpace mode" : "Mock demonstration mode"}</strong><small>This upload uses the documented default start position [0, 0, 1.5].</small></div>
      </div>
      {error && <ErrorState message={error} />}
      <form className="capture-form" onSubmit={submit}>
        <section className="section-card capture-step">
          <div className="capture-step-heading"><span>1</span><div><h2>Capture destination</h2><p>Choose where this capture belongs and how it will appear.</p></div></div>
          <div className="form-grid mb-0">
            <div>
              <label className="form-label" htmlFor="siteId">Project</label>
              <select className="form-select" id="siteId" name="siteId" value={form.siteId} onChange={updateField} required>
                {projects.length === 0 && <option value="">No projects configured</option>}
                {projects.map((project) => <option value={project.siteId} key={project.siteId}>{project.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="sheetId">Floor</label>
              <select className="form-select" id="sheetId" name="sheetId" value={form.sheetId} onChange={updateField} disabled={!selectedProject?.canUpload} required>
                {!selectedProject?.canUpload && <option value="">No floor sheets are configured</option>}
                {selectedProject?.sheets.map((sheet) => <option value={sheet.sheetId} key={sheet.sheetId}>{sheet.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="captureName">Capture name</label>
              <input className="form-control" id="captureName" name="captureName" value={form.captureName} onChange={updateField} placeholder="Morning inspection" maxLength="120" required />
            </div>
            <div>
              <label className="form-label" htmlFor="capturedAt">Capture date and time</label>
              <input className="form-control" type="datetime-local" step="1" id="capturedAt" name="capturedAt" value={form.capturedAt} onChange={updateField} required />
              <small className={`form-text${captureTimeDetected ? " detected-value" : ""}`}>
                {captureTimeDetected ? "✓ Detected from the Insta360 filename. Please verify it." : "Enter the actual recording start time, including seconds."}
              </small>
            </div>
          </div>
        </section>

        <section className="section-card capture-step">
          <div className="capture-step-heading"><span>2</span><div><h2>Camera information</h2><p>Identify the Insta360 camera used for this recording.</p></div></div>
          <label className="form-label" htmlFor="deviceId">Camera device ID</label>
          <div className="input-with-prefix"><span aria-hidden="true">360°</span><input className="form-control" id="deviceId" name="deviceId" value={form.deviceId} onChange={updateField} placeholder="Insta360 X5:sn:SERIAL_NUMBER" required /></div>
          <small className="form-text">Use the OpenSpace format CameraType:sn:SerialNumber.</small>
        </section>

        <section className="section-card capture-step">
          <div className="capture-step-heading"><span>3</span><div><h2>Select capture file</h2><p>Add one INSV file copied from the camera.</p></div></div>
          <input className="visually-hidden" type="file" id="file" name="file" accept=".insv" onChange={updateField} required />
          <label className={`file-drop${form.file ? " has-file" : ""}`} htmlFor="file">
            <span className="file-drop-icon" aria-hidden="true">{form.file ? "✓" : "⇧"}</span>
            <span className="file-drop-copy">
              <strong>{form.file ? form.file.name : "Choose an INSV capture file"}</strong>
              <small>{form.file ? `${formatBytes(form.file.size)} · Click to choose a different file` : "Browse this computer · One .insv file only"}</small>
            </span>
            <span className="btn btn-outline-primary">{form.file ? "Replace file" : "Browse file"}</span>
          </label>
          <p className="capture-help">Camera-to-computer transfer is outside this MVP. Select the file after it has been copied locally.</p>
        </section>

        {submitting && (
          <div className="local-transfer" role="status">
            <div className="d-flex justify-content-between">
              <span>Copying file to the local Node.js uploader</span>
              <strong>{localProgress}%</strong>
            </div>
            <div className="progress">
              <div
                className="progress-bar"
                style={{ width: `${localProgress}%` }}
              />
            </div>
          </div>
        )}
        <div className="capture-submit-bar">
          <div><strong>Ready to upload?</strong><span>The file is sent to your Node.js backend, never directly from the browser to OpenSpace.</span></div>
          <button className="btn btn-primary btn-lg" disabled={submitting || !selectedProject?.canUpload}>{submitting ? "Preparing upload…" : "Upload capture"}</button>
        </div>
      </form>
    </div>
  );
}
