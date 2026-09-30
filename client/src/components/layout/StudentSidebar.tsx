import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Sparkles,
  ClipboardList,
  Calendar,
  TrendingUp,
  Trophy,
  Compass,
  User,
  Settings,
} from "lucide-react";
import clsx from "clsx";
import { LogoIcon } from "../icons/LogoIcon";

export function StudentSidebar({ careerVisible }: { careerVisible: boolean }) {
  const { t } = useTranslation();

  const items = [
    { to: "/dashboard", icon: LayoutDashboard, label: t("nav_sidebar.dashboard") },
    { to: "/chat", icon: Sparkles, label: t("nav_sidebar.aiChat") },
    { to: "/quiz", icon: ClipboardList, label: t("nav_sidebar.quiz") },
    { to: "/schedule", icon: Calendar, label: t("nav_sidebar.schedule") },
    { to: "/progress", icon: TrendingUp, label: t("nav_sidebar.progress") },
    { to: "/achievements", icon: Trophy, label: t("nav_sidebar.achievements") },
    ...(careerVisible ? [{ to: "/career", icon: Compass, label: t("nav_sidebar.career") }] : []),
    { to: "/profile", icon: User, label: t("nav_sidebar.profile") },
    { to: "/settings", icon: Settings, label: t("nav_sidebar.settings") },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 sticky top-0 h-screen overflow-y-auto bg-[#1a1533] text-white px-4 py-6 gap-1">
      <div className="flex items-center gap-2 font-bold text-lg px-2 mb-6">
        <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center">
          <LogoIcon size={18} />
        </div>
        AI Advisor
      </div>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            clsx(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
              isActive ? "bg-brand-500 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
            )
          }
        >
          <item.icon size={18} />
          {item.label}
        </NavLink>
      ))}
    </aside>
  );
}
