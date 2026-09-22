import { NavLink } from "react-router-dom";
import { Home, Calendar, Target, Sparkles, Menu } from "lucide-react";
import clsx from "clsx";

const items = [
  { to: "/dashboard", icon: Home, label: "Home" },
  { to: "/schedule", icon: Calendar, label: "Today" },
  { to: "/achievements", icon: Target, label: "Goals" },
  { to: "/chat", icon: Sparkles, label: "AI" },
  { to: "/profile", icon: Menu, label: "More" },
];

export function MobileBottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-card)] border-t border-[var(--border-subtle)] flex items-center justify-around py-2 z-40">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            clsx(
              "flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium min-w-[56px] min-h-[44px] justify-center",
              isActive ? "text-brand-600" : "text-[var(--text-secondary)]"
            )
          }
        >
          <item.icon size={20} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
