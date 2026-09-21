import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ErrorState, LoadingState } from "../components/FeedbackState.jsx";
import { PageHeading } from "../components/PageHeading.jsx";
import { configApi } from "../services/configApi.js";
import { projectApi } from "../services/projectApi.js";
import { uploadApi } from "../services/uploadApi.js";
import { formatBytes, toLocalDateTimeInput } from "../utils/format.js";

/** Validates capture metadata and sends one INSV file to the local Node.js API. */

export function NewCapturePage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [mode, setMode] = useState("mock");
  const [maximumUploadBytes, setMaximumUploadBytes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
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
      setError("The selected project has no configured floor sheet..");
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
      navigate(`/captures/${upload.id}/progress-test`);
    } catch (requestError) {
      setError(requestError.message);
      setSubmitting(false);
    }
  }

  if (loading)
    return <LoadingState message="Loading project and floor information…" />;

  return (
    <div className="content-width form-width">
      <PageHeading
        title="Create new upload"
        description="Select an approved local project and floor, then add one captured INSV file."
      />
      <div className="mode-notice">
        <strong>{mode === "live" ? "Live mode" : "Mock mode"}.</strong> This MVP
        uses the documented default start position <strong>[0, 0, 1.5]</strong>.
      </div>
      {error && <ErrorState message={error} />}
      <form className="section-card capture-form" onSubmit={submit}>
        <div className="form-grid">
          <div>
            <label className="form-label" htmlFor="siteId">
              Project
            </label>
            <select
              className="form-select"
              id="siteId"
              name="siteId"
              value={form.siteId}
              onChange={updateField}
              required
            >
              {projects.length === 0 && (
                <option value="">No projects configured</option>
              )}
              {projects.map((project) => (
                <option value={project.siteId} key={project.siteId}>
                  {project.name}
                </option>
              ))}
            </select>
            {selectedProject && (
              <small className="form-text">{selectedProject.address}</small>
            )}
          </div>
          <div>
            <label className="form-label" htmlFor="sheetId">
              Floor
            </label>
            <select
              className="form-select"
              id="sheetId"
              name="sheetId"
              value={form.sheetId}
              onChange={updateField}
              disabled={!selectedProject?.canUpload}
              required
            >
              {!selectedProject?.canUpload && (
                <option value="">No floor sheets are configured</option>
              )}
              {selectedProject?.sheets.map((sheet) => (
                <option value={sheet.sheetId} key={sheet.sheetId}>
                  {sheet.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="captureName">
              Capture name
            </label>
            <input
              className="form-control"
              id="captureName"
              name="captureName"
              value={form.captureName}
              onChange={updateField}
              placeholder="Morning inspection"
              maxLength="120"
              required
            />
          </div>
          <div>
            <label className="form-label" htmlFor="capturedAt">
              Capture date and time
            </label>
            <input
              className="form-control"
              type="datetime-local"
              id="capturedAt"
              name="capturedAt"
              value={form.capturedAt}
              onChange={updateField}
              required
            />
          </div>
          <div className="grid-span-2">
            <label className="form-label" htmlFor="deviceId">
              Camera device ID
            </label>
            <input
              className="form-control"
              id="deviceId"
              name="deviceId"
              value={form.deviceId}
              onChange={updateField}
              placeholder="Insta360 x5:sn:SERIAL_NUMBER"
              required
            />
            <small className="form-text">
              Use the OpenSpace format CameraType:sn:SerialNumber.
            </small>
          </div>
          <div className="grid-span-2 file-drop">
            <label className="form-label" htmlFor="file">
              INSV capture file
            </label>
            <input
              className="form-control"
              type="file"
              id="file"
              name="file"
              accept=".insv"
              onChange={updateField}
              required
            />
            <small className="form-text">
              {form.file
                ? `${form.file.name} . ${formatBytes(form.file.size)}`
                : "Choose the file copied from the camera. Camera transfer is outside this MVP."}
            </small>
          </div>
        </div>
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
        <button
          className="btn btn-primary btn-lg w-100"
          disabled={submitting || !selectedProject?.canUpload}
        >
          {submitting ? "Preparing upload..." : "Upload capture"}
        </button>
      </form>
    </div>
  );
}
