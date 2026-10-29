import { NavLink } from "react-router-dom";

const TABS = [
  ["/", "Today"],
  ["/closet", "Closet"],
  ["/history", "History"],
  ["/settings", "Settings"],
];

export default function TabBar() {
  return (
    <nav className="tabs">
      {TABS.map(([to, label]) => (
        <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
