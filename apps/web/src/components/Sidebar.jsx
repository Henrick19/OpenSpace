import { NavLink } from "react-router-dom";

// Main page destinations. NavLink supplies isActive for the selected blue state.
const links = [
  { to: "/dashboard", label: "Dashboard", icon: "▦" },
  { to: "/captures/new", label: "New upload", icon: "+" },
  { to: "/captures", label: "Upload history", icon: "↻" },
];

/** Persistent application navigation shared by every routed page. */
export function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Main navigation">
      <nav className="nav nav-pills flex-column gap-2">
        {links.map((link) => (
          <NavLink
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            end
            key={link.to}
            to={link.to}
          >
            <span aria-hidden="true" className="nav-icon">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-foot">Local MVP<br /><span>OpenSpace integration</span></div>
    </aside>
  );
}
