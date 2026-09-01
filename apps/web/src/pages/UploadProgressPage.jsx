import { useParams } from "react-router-dom";

export function UploadProgressPage() {
  const { captureId } = useParams();
  return (
    <section>
      <h1 className="h2">Upload progress</h1>
      <p className="text-secondary">Capture job: {captureId}</p>
      <div className="progress" role="progressbar" aria-label="Upload progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <div className="progress-bar" style={{ width: "0%" }}>0%</div>
      </div>
    </section>
  );
}
