"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useAuthStore } from "@/stores/auth.store";
import type { AuthUser } from "@/types/auth.types";

interface DashboardShellProps {
  user: AuthUser | null;
  children: ReactNode;
}

/**
 * Client-side shell composing the sidebar + top bar + page content. A Client
 * Component only because it owns the mobile nav drawer's open/closed state —
 * the server-decoded `user` prop seeds the initial render (avoiding an extra
 * client fetch / hydration flash), but the Zustand store (kept in sync by
 * `AuthStoreHydrator` and updated directly by mutations like
 * `useAuth.ts#useUpdateProfile`) takes over once populated, so Sidebar/Topbar
 * reflect a profile update immediately — without waiting for the
 * server-rendered layout to re-run, which it wouldn't for name/email anyway
 * since the backend never reissues the JWT on `Auth/UpdateProfile` (see
 * `hooks/useAuth.ts#useUpdateProfile`'s doc comment).
 */
export function DashboardShell({ user: initialUser, children }: DashboardShellProps) {
  const storeUser = useAuthStore((state) => state.user);
  const user = storeUser ?? initialUser;
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="hidden lg:block">
        <Sidebar user={user} />
      </div>

      {isMobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-slate-950/60"
            onClick={() => setIsMobileNavOpen(false)}
          />
          <div className="relative z-50 h-full w-64">
            <Sidebar user={user} onNavigate={() => setIsMobileNavOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar user={user} onOpenMobileNav={() => setIsMobileNavOpen(true)} />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
