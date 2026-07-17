import { create } from "zustand";
import type { AuthUser } from "@/types/auth.types";

/**
 * Client-side auth slice. Deliberately in-memory only (no `persist`
 * middleware / localStorage) — the JWT lives exclusively in httpOnly
 * cookies, and this store only ever holds the non-sensitive `AuthUser` DTO
 * for UI purposes (name/role display, conditional rendering). It is
 * hydrated from server-rendered data on each protected layout render (see
 * `components/providers/AuthStoreHydrator.tsx`) and updated optimistically
 * after login/profile mutations.
 */
interface AuthState {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
