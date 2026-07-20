"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { NAV_SECTIONS } from "@/lib/constants/navigation.constants";
import type { AuthUser } from "@/types/auth.types";

interface SidebarProps {
  user: AuthUser | null;
  /** Invoked after a real navigation link is clicked — used to close the mobile drawer. */
  onNavigate?: () => void;
}

function getInitials(user: AuthUser | null): string {
  if (!user) return "?";
  const first = user.firstName?.[0] ?? user.username?.[0] ?? user.email?.[0] ?? "";
  const last = user.lastName?.[0] ?? "";
  const initials = `${first}${last}`.trim();
  return initials ? initials.toUpperCase() : "U";
}

/**
 * Resolves which single nav `href` should be highlighted as active for the
 * current `pathname`, picking the *longest* (most specific) matching href
 * among all implemented items — e.g. on `/timesheets/history`, both
 * `/timesheets` ("My Timesheets") and `/timesheets/history`
 * ("Timesheet History") match by prefix, but only the latter, more specific
 * route should render as active.
 */
function resolveActiveHref(pathname: string | null, hrefs: string[]): string | null {
  if (!pathname) return null;
  let best: string | null = null;
  for (const href of hrefs) {
    if (pathname === href || pathname.startsWith(`${href}/`)) {
      if (!best || href.length > best.length) best = href;
    }
  }
  return best;
}

/**
 * Dark, fixed-width application sidebar per the wireframe
 * (`docs/HR_System_FE_wireframe.pdf`): brand header, grouped navigation
 * sections, and a user/sign-out footer. Client Component because active-link
 * highlighting depends on the current pathname.
 */
export function Sidebar({ user, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const displayName = user?.firstName || user?.username || user?.email || "Guest";

  const visibleSections = NAV_SECTIONS.filter(
    (section) => !section.requiredRole || user?.role === section.requiredRole
  );

  const implementedHrefs = visibleSections.flatMap((section) =>
    section.items.filter((item) => item.implemented).map((item) => item.href)
  );
  const activeHref = resolveActiveHref(pathname, implementedHrefs);

  return (
    <aside
      aria-label="Primary"
      className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-slate-100"
    >
      <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-5">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-xs font-semibold text-white"
        >
          HR
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">HR System</p>
          <p className="truncate text-xs text-slate-400">Time &amp; Invoice</p>
        </div>
      </div>

      <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-3 py-4">
        {visibleSections.map((section) => (
          <div key={section.label ?? "root"} className="mb-4">
            {section.label && (
              <h2 className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {section.label}
              </h2>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;

                if (!item.implemented) {
                  return (
                    <li key={item.href}>
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        title={`${item.label} — coming soon`}
                        className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-500 opacity-60"
                      >
                        <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        <span className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                          Soon
                        </span>
                      </button>
                    </li>
                  );
                }

                const isActive = item.href === activeHref;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {user && (
        <div className="border-t border-slate-800 px-4 py-4">
          <Link
            href="/profile"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-lg px-1 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 hover:bg-slate-800"
          >
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white"
            >
              {getInitials(user)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-white">{displayName}</span>
              <span className="block truncate text-xs text-slate-400">{user.role}</span>
            </span>
          </Link>
          <div className="mt-3">
            <LogoutButton />
          </div>
        </div>
      )}
    </aside>
  );
}
