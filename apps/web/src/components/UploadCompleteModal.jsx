import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

/** Completion dialog shown only after backend processing confirmation. */
export function UploadCompleteModal({ show, upload, onClose }) {
  const navigate = useNavigate();
  const closeButton = useRef(null);

  useEffect(() => {
    if (!show) return undefined;
    closeButton.current?.focus();
    const handleEscape = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [show, onClose]);

  if (!show || !upload) return null;
  const destination = upload.viewerUrl || "https://sgp.openspace.ai/";

  return (
    <>
      <div className="modal-backdrop fade show" />
      <div className="modal fade show d-block" role="dialog" aria-modal="true" aria-labelledby="uploadCompleteTitle">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content complete-modal">
            <div className="modal-header border-0">
              <button ref={closeButton} className="btn-close" onClick={onClose} aria-label="Close" />
            </div>
            <div className="modal-body text-center pt-0">
              <div className="complete-icon" aria-hidden="true">✓</div>
              <h2 id="uploadCompleteTitle">Processing confirmed</h2>
              <p className="text-secondary">
                OpenSpace no longer reports this capture as pending. Sign in to OpenSpace Singapore to review it.
              </p>
              <dl className="complete-details text-start">
                <div><dt>File</dt><dd>{upload.fileName}</dd></div>
                <div><dt>Project</dt><dd>{upload.projectName}</dd></div>
                <div><dt>Floor</dt><dd>{upload.floorName}</dd></div>
              </dl>
              <a className="btn btn-primary w-100" href={destination} target="_blank" rel="noreferrer">
                Open OpenSpace Singapore ↗
              </a>
            </div>
            <div className="modal-footer border-0 justify-content-center">
              <button className="btn btn-link" onClick={() => navigate("/dashboard")}>Back to dashboard</button>
              <button className="btn btn-link" onClick={() => navigate("/captures")}>View upload history</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
