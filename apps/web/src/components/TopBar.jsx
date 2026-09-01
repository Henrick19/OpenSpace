export function TopBar() {
  return (
    <header className="top-bar navbar navbar-dark px-3 px-lg-4">
      <div className="d-flex align-items-center gap-3">
        <span className="brand-mark" aria-hidden="true">PSB</span>
        <span className="navbar-brand mb-0 h1">OpenSpace Capture Dashboard</span>
      </div>
      <span className="small">Singapore</span>
    </header>
  );
}
