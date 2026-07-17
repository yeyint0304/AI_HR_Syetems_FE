"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { getBreadcrumbLabel } from "@/lib/constants/navigation.constants";
import type { AuthUser } from "@/types/auth.types";

interface TopbarProps {
  user: AuthUser | null;
  onOpenMobileNav: () => void;
}

function getInitials(user: AuthUser | null): string {
  if (!user) return "?";
  const first = user.firstName?.[0] ?? user.username?.[0] ?? user.email?.[0] ?? "";
  const last = user.lastName?.[0] ?? "";
  const initials = `${first}${last}`.trim();
  return initials ? initials.toUpperCase() : "U";
}

/**
 * Light top bar shown above the page content: breadcrumb (page title) on the
 * left, mobile nav toggle, and a profile-link avatar on the right — per the
 * wireframe (`docs/HR_System_FE_wireframe.pdf`).
 */
export function Topbar({ user, onOpenMobileNav }: TopbarProps) {
  const pathname = usePathname();
  const pageTitle = getBreadcrumbLabel(pathname ?? "/home");
  const displayName = user?.firstName || user?.username || user?.email || "your account";

  return (
    <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
        </button>

        <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href="/home" className="hover:text-slate-700">
                Dashboard
              </Link>
            </li>
            {pageTitle !== "Dashboard" && (
              <>
                <li aria-hidden="true">/</li>
                <li className="font-medium text-slate-900">{pageTitle}</li>
              </>
            )}
          </ol>
        </nav>
      </div>

      {user && (
        <Link
          href="/profile"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          aria-label={`View profile for ${displayName}`}
        >
          {getInitials(user)}
        </Link>
      )}
    </header>
  );
}
