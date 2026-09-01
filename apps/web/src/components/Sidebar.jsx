import { NavLink } from "react-router-dom";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/captures/new", label: "New capture" },
  { to: "/captures", label: "Capture history" },
];

export function Sidebar() {
  return (
    <aside className="sidebar p-3" aria-label="Main navigation">
      <nav className="nav nav-pills flex-column gap-2">
        {links.map((link) => (
          <NavLink
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            key={link.to}
            to={link.to}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
