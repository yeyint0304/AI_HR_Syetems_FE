"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLogout } from "@/hooks/useAuth";
import { getFullName, getUserInitials } from "@/lib/utils/userDisplay";
import type { AuthUser } from "@/types/auth.types";

export interface UserMenuProps {
  user: AuthUser;
}

/**
 * Topbar avatar dropdown, matching the wireframe's header-icon menu
 * (`docs/HR_System_FE_wireframe.pdf`: "Header icon -> dropdown [showing the
 * signed-in user's identity] ... Sign Out") — here showing the real signed-in
 * user's name/role plus quick links to Profile/Change password and Sign out,
 * in place of the wireframe's prototype-only "switch demo user" list.
 *
 * The menu panel is capped at a 300px max-height (`max-h-[300px]`) with
 * `overflow-y-auto`, matching the fixed cap applied to every other
 * data-listing dropdown in the app (`components/ui/SearchableSelectField.tsx`),
 * so it never grows unbounded regardless of how many items it ends up
 * rendering.
 */
export function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const logoutMutation = useLogout();
  const displayName = getFullName(user) || "your account";

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function closeMenu() {
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Account menu for ${displayName}`}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      >
        {getUserInitials(user)}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full z-20 mt-2 max-h-[300px] w-64 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-medium text-slate-900">{displayName}</p>
            <p className="truncate text-xs text-slate-500">{user.role}</p>
          </div>
          <Link
            href="/profile"
            role="menuitem"
            onClick={closeMenu}
            className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            View profile
          </Link>
          <Link
            href="/profile/change-password"
            role="menuitem"
            onClick={closeMenu}
            className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Change password
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {logoutMutation.isPending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
