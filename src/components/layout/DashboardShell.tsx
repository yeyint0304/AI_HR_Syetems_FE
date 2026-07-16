"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import type { AuthUser } from "@/types/auth.types";

interface DashboardShellProps {
  user: AuthUser | null;
  children: ReactNode;
}

/**
 * Client-side shell composing the sidebar + top bar + page content. A Client
 * Component only because it owns the mobile nav drawer's open/closed state —
 * the actual user is decoded server-side and passed down as a prop, so
 * there's no client-side auth fetch here.
 */
export function DashboardShell({ user, children }: DashboardShellProps) {
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
