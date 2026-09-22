import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

type Role = "STUDENT" | "PARENT" | "ADMIN";

const HOME_BY_ROLE: Record<Role, string> = {
  STUDENT: "/dashboard",
  PARENT: "/parent",
  ADMIN: "/admin",
};

export function ProtectedRoute({ allow }: { allow: Role[] }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role as Role)) {
    return <Navigate to={HOME_BY_ROLE[user.role as Role]} replace />;
  }
  return <Outlet />;
}
