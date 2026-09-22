import psbAcademyLogo from "../assets/psb-academy-logo.jpeg";

/** Shared PSB/OpenSpace header and regional-environment label. */
export function TopBar() {
  return (
    <header className="top-bar navbar navbar-dark px-3 px-lg-4">
      <div className="d-flex align-items-center gap-3">
        <img
          className="brand-logo"
          src={psbAcademyLogo}
          alt="PSB Academy"
        />
        <span className="navbar-brand mb-0">OpenSpace Capture Dashboard</span>
      </div>
      <div className="region-label"><span className="region-dot" /> Singapore</div>
    </header>
  );
}
