import { useCallback, useEffect, useMemo, useState } from "react";

import { LoadingState } from "../components/FeedbackState.jsx";
import { PageHeading } from "../components/PageHeading.jsx";
import { cameraApi } from "../services/cameraApi.js";
import { projectApi } from "../services/projectApi.js";

const EMPTY_PROJECT = {
  siteId: "",
  name: "",
  includeFirstSheet: false,
  sheetId: "",
  sheetName: "",
};

const EMPTY_SHEET = { siteId: "", sheetId: "", name: "" };
const EMPTY_CAMERA = { deviceId: "", displayName: "" };

/** Local administration page for approved OpenSpace project and floor IDs. */
export function ProjectCataloguePage() {
  const [projects, setProjects] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [activeForm, setActiveForm] = useState("project");
  const [projectForm, setProjectForm] = useState(EMPTY_PROJECT);
  const [sheetForm, setSheetForm] = useState(EMPTY_SHEET);
  const [cameraForm, setCameraForm] = useState(EMPTY_CAMERA);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProjects = useCallback(async () => {
    try {
      const [projectItems, cameraItems] = await Promise.all([projectApi.list(), cameraApi.list()]);
      setProjects(projectItems);
      setCameras(cameraItems);
      setSheetForm((current) => ({
        ...current,
        siteId: projectItems.some((project) => project.siteId === current.siteId)
          ? current.siteId
          : (projectItems[0]?.siteId ?? ""),
      }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.siteId === sheetForm.siteId),
    [projects, sheetForm.siteId],
  );

  function updateProject(event) {
    const { name, value, checked, type } = event.target;
    setProjectForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  function updateSheet(event) {
    const { name, value } = event.target;
    setSheetForm((current) => ({ ...current, [name]: value }));
  }

  function updateCamera(event) {
    const { name, value } = event.target;
    setCameraForm((current) => ({ ...current, [name]: value }));
  }

  function switchForm(nextForm) {
    setActiveForm(nextForm);
    setError("");
    setSuccess("");
  }

  async function createProject(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await projectApi.create({
        siteId: projectForm.siteId.trim(),
        name: projectForm.name.trim(),
        firstSheet: projectForm.includeFirstSheet ? {
          sheetId: projectForm.sheetId.trim(),
          name: projectForm.sheetName.trim(),
        } : null,
      });
      setProjectForm(EMPTY_PROJECT);
      setSuccess(projectForm.includeFirstSheet
        ? "Project and first floor added to the local catalogue."
        : "Project added to the local catalogue.");
      await loadProjects();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function addSheet(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await projectApi.addSheet(sheetForm.siteId, {
        sheetId: sheetForm.sheetId.trim(),
        name: sheetForm.name.trim(),
      });
      setSheetForm((current) => ({ ...EMPTY_SHEET, siteId: current.siteId }));
      setSuccess("Floor added to the selected project. It is now available on the New Upload page.");
      await loadProjects();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function addCamera(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await cameraApi.create({
        deviceId: cameraForm.deviceId.trim(),
        displayName: cameraForm.displayName.trim(),
      });
      setCameraForm(EMPTY_CAMERA);
      setSuccess("Camera added to the local catalogue. It is now available on the New Upload page.");
      await loadProjects();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState message="Loading the local project catalogue…" />;

  return (
    <div className="content-width catalogue-page">
      <PageHeading
        title="Project and camera catalogue"
        description="Register approved OpenSpace projects, floors and physical cameras in the shared local SQLite database."
      />

      <div className="catalogue-notice">
        <span aria-hidden="true">i</span>
        <div>
          <strong>Local administration only</strong>
          <p>Copy approved IDs from the authorised OpenSpace web app or camera record. This page does not call unsupported OpenSpace listing endpoints.</p>
        </div>
      </div>

      <div className="catalogue-choice" role="tablist" aria-label="Catalogue action">
        <button type="button" role="tab" aria-selected={activeForm === "project"} className={activeForm === "project" ? "active" : ""} onClick={() => switchForm("project")}>
          <span aria-hidden="true">+</span><strong>New project</strong><small>Optionally add its first floor</small>
        </button>
        <button type="button" role="tab" aria-selected={activeForm === "sheet"} className={activeForm === "sheet" ? "active" : ""} onClick={() => switchForm("sheet")} disabled={projects.length === 0}>
          <span aria-hidden="true">▤</span><strong>Add floor</strong><small>Use an existing local project</small>
        </button>
        <button type="button" role="tab" aria-selected={activeForm === "camera"} className={activeForm === "camera" ? "active" : ""} onClick={() => switchForm("camera")}>
          <span aria-hidden="true">360°</span><strong>Add camera</strong><small>Make a physical camera selectable</small>
        </button>
      </div>

      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {success && <div className="alert alert-success" role="status">{success}</div>}

      {activeForm === "project" ? (
        <form className="section-card catalogue-form" onSubmit={createProject}>
          <div className="catalogue-form-heading"><div><span>01</span><h2>Project details</h2></div><p>Required information from the OpenSpace project URL.</p></div>
          <div className="form-grid">
            <div>
              <label className="form-label" htmlFor="catalogueSiteId">Site ID</label>
              <input className="form-control code-input" id="catalogueSiteId" name="siteId" value={projectForm.siteId} onChange={updateProject} placeholder="OpenSpace site ID" autoComplete="off" required />
            </div>
            <div>
              <label className="form-label" htmlFor="catalogueProjectName">Project display name</label>
              <input className="form-control" id="catalogueProjectName" name="name" value={projectForm.name} onChange={updateProject} placeholder="PSB Academy - New Project" required />
            </div>
          </div>

          <label className="catalogue-check">
            <input type="checkbox" name="includeFirstSheet" checked={projectForm.includeFirstSheet} onChange={updateProject} />
            <span><strong>Add the first floor now</strong><small>You can also add floors later using the Add floor form.</small></span>
          </label>

          {projectForm.includeFirstSheet && (
            <div className="catalogue-subform">
              <div className="catalogue-form-heading"><div><span>02</span><h2>First floor</h2></div><p>The default start position will be [0, 0, 1.5].</p></div>
              <div className="form-grid mb-0">
                <div>
                  <label className="form-label" htmlFor="firstSheetId">Sheet ID</label>
                  <input className="form-control code-input" id="firstSheetId" name="sheetId" value={projectForm.sheetId} onChange={updateProject} placeholder="OpenSpace sheet ID" required />
                </div>
                <div>
                  <label className="form-label" htmlFor="firstSheetName">Floor display name</label>
                  <input className="form-control" id="firstSheetName" name="sheetName" value={projectForm.sheetName} onChange={updateProject} placeholder="L4 - Main Wing" required />
                </div>
              </div>
            </div>
          )}

          <div className="catalogue-submit"><button className="btn btn-primary btn-lg" disabled={submitting}>{submitting ? "Saving…" : "Add project to catalogue"}</button></div>
        </form>
      ) : activeForm === "sheet" ? (
        <form className="section-card catalogue-form" onSubmit={addSheet}>
          <div className="catalogue-form-heading"><div><span>01</span><h2>Select project</h2></div><p>The new floor will appear under this project.</p></div>
          <div className="form-grid">
            <div className="grid-span-2">
              <label className="form-label" htmlFor="sheetProject">Existing project</label>
              <select className="form-select" id="sheetProject" name="siteId" value={sheetForm.siteId} onChange={updateSheet} required>
                {projects.map((project) => <option key={project.siteId} value={project.siteId}>{project.name}</option>)}
              </select>
              {selectedProject && <small className="form-text code-text">Site ID: {selectedProject.siteId}</small>}
            </div>
          </div>
          <div className="catalogue-subform">
            <div className="catalogue-form-heading"><div><span>02</span><h2>Floor details</h2></div><p>The default start position will be [0, 0, 1.5].</p></div>
            <div className="form-grid mb-0">
              <div>
                <label className="form-label" htmlFor="newSheetId">Sheet ID</label>
                <input className="form-control code-input" id="newSheetId" name="sheetId" value={sheetForm.sheetId} onChange={updateSheet} placeholder="OpenSpace sheet ID" autoComplete="off" required />
              </div>
              <div>
                <label className="form-label" htmlFor="newSheetName">Floor display name</label>
                <input className="form-control" id="newSheetName" name="name" value={sheetForm.name} onChange={updateSheet} placeholder="L4 - STEM Wing" required />
              </div>
            </div>
          </div>
          <div className="catalogue-submit"><button className="btn btn-primary btn-lg" disabled={submitting || !sheetForm.siteId}>{submitting ? "Saving…" : "Add floor to project"}</button></div>
        </form>
      ) : (
        <form className="section-card catalogue-form" onSubmit={addCamera}>
          <div className="catalogue-form-heading"><div><span>01</span><h2>Camera details</h2></div><p>Use the exact identity required by OpenSpace.</p></div>
          <div className="form-grid mb-0">
            <div>
              <label className="form-label" htmlFor="cameraDisplayName">Camera display name</label>
              <input className="form-control" id="cameraDisplayName" name="displayName" value={cameraForm.displayName} onChange={updateCamera} placeholder="Insta360 X5 – Lab camera" required />
            </div>
            <div>
              <label className="form-label" htmlFor="cameraDeviceId">OpenSpace camera device ID</label>
              <input className="form-control code-input" id="cameraDeviceId" name="deviceId" value={cameraForm.deviceId} onChange={updateCamera} placeholder="Insta360 X5:sn:SERIAL_NUMBER" autoComplete="off" required />
              <small className="form-text">Required format: CameraType:sn:SerialNumber</small>
            </div>
          </div>
          <div className="catalogue-submit"><button className="btn btn-primary btn-lg" disabled={submitting}>{submitting ? "Saving…" : "Add camera to catalogue"}</button></div>
        </form>
      )}

      <section className="catalogue-overview" aria-label="Current local catalogue">
        <div className="section-card-heading"><div><h2>Current catalogue</h2><p>{projects.length} active project{projects.length === 1 ? "" : "s"} stored locally.</p></div><button className="btn btn-outline-secondary" onClick={loadProjects}>Refresh</button></div>
        <div className="catalogue-projects">
          {projects.map((project) => (
            <article className="catalogue-project" key={project.siteId}>
              <div><h3>{project.name}</h3><code>{project.siteId}</code></div>
              <div className="catalogue-sheet-list">
                {project.sheets.length === 0 ? <span className="empty-sheet">No floors configured</span> : project.sheets.map((sheet) => (
                  <span key={sheet.sheetId}><strong>{sheet.name}</strong><code>{sheet.sheetId}</code></span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="catalogue-overview" aria-label="Current camera catalogue">
        <div className="section-card-heading"><div><h2>Current cameras</h2><p>{cameras.length} active camera{cameras.length === 1 ? "" : "s"} available for upload.</p></div><button className="btn btn-outline-secondary" onClick={loadProjects}>Refresh</button></div>
        <div className="catalogue-cameras">
          {cameras.length === 0 ? <span className="empty-sheet">No cameras configured</span> : cameras.map((camera) => (
            <article className="catalogue-camera" key={camera.deviceId}>
              <div><h3>{camera.displayName}</h3><span>{camera.model}</span></div>
              <code>{camera.deviceId}</code>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
