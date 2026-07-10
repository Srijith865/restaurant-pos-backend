import { NavLink, useNavigate } from "react-router-dom";
import { clearToken } from "../api/auth";
import type { NavItem } from "./AppLayout";

interface SidebarProps {
  active: NavItem;
  restaurantName?: string;
  isAdmin?: boolean;
}

const links: { to: string; key: NavItem; icon: string; label: string }[] = [
  { to: "/pos", key: "pos", icon: "point_of_sale", label: "POS" },
  { to: "/kitchen", key: "kitchen", icon: "restaurant", label: "Kitchen" },
  { to: "/billing", key: "billing", icon: "receipt_long", label: "Billing" },
];

const adminLinks: { to: string; key: NavItem; icon: string; label: string }[] = [
  {
    to: "/dashboard",
    key: "dashboard",
    icon: "dashboard",
    label: "Dashboard",
  },
  {
    to: "/admin",
    key: "admin",
    icon: "admin_panel_settings",
    label: "Admin",
  },
];

export default function Sidebar({ active, restaurantName, isAdmin }: SidebarProps) {
  const navigate = useNavigate();
  const navLinks = isAdmin ? [...links, ...adminLinks] : links;

  function handleSignOut() {
    clearToken();
    navigate("/login");
  }

  return (
    <nav className="fixed left-0 top-0 z-50 hidden h-full w-64 flex-col gap-sm border-r border-outline-variant bg-surface-container-low px-md py-lg md:flex">
      <div className="mb-xl px-sm">
        <h2 className="text-h2 font-bold tracking-tight text-primary">
          {restaurantName ?? "Bluefox"}
        </h2>
      </div>

      <div className="flex flex-1 flex-col gap-xs">
        {navLinks.map(({ to, key, icon, label }) => (
          <NavLink
            key={key}
            to={to}
            className={`flex items-center gap-sm rounded px-sm py-sm transition-all ${
              active === key
                ? "scale-95 border-l-2 border-primary bg-surface-container-highest font-semibold text-primary duration-75"
                : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={active === key ? { fontVariationSettings: '"FILL" 1' } : undefined}
            >
              {icon}
            </span>
            <span className="text-label-md">{label}</span>
          </NavLink>
        ))}
      </div>

      <div className="flex flex-col gap-xs border-t border-outline-variant pt-md">
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-sm rounded px-sm py-sm text-on-surface-variant transition-all hover:bg-surface-container-high"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="text-label-md">Sign Out</span>
        </button>
      </div>
    </nav>
  );
}
