import { create } from "zustand";
import { AuthSession } from "../lib/api";

// Read synchronously at store-creation time (before React's first render),
// not inside a useEffect — a useEffect runs only after commit, and
// ProtectedRoute's guard reads `user` on that very first render. On a fresh
// page load (F5, or navigating straight to a URL) that gap made a real,
// still-valid session look logged-out for one tick, and React Router's
// <Navigate> fires its own redirect effect before a parent effect like
// hydrate() would ever get a chance to run — bouncing a genuinely
// authenticated user to /login.
function loadStoredUser(): AuthSession["user"] | null {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

interface AuthState {
  user: AuthSession["user"] | null;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: loadStoredUser(),
  setSession: (session) => {
    localStorage.setItem("accessToken", session.accessToken);
    localStorage.setItem("refreshToken", session.refreshToken);
    localStorage.setItem("user", JSON.stringify(session.user));
    set({ user: session.user });
  },
  clearSession: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    set({ user: null });
  },
}));
