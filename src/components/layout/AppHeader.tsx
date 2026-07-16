import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { USER_ROLES } from "@/lib/constants/auth.constants";
import type { AuthUser } from "@/types/auth.types";

interface AppHeaderProps {
  user: AuthUser | null;
}

/**
 * Server Component header for the authenticated shell. Receives the current
 * user (decoded server-side from the httpOnly access-token cookie) directly
 * as a prop — no client-side fetch needed for the initial render.
 */
export function AppHeader({ user }: AppHeaderProps) {
  const displayName = user?.firstName || user?.username || user?.email;

  return (
    <header className="border-b border-slate-800 bg-slate-950 text-white">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-xs"
          >
            HR
          </span>
          HR System
        </Link>

        {user && (
          <nav aria-label="Primary" className="hidden items-center gap-5 text-sm text-slate-300 sm:flex">
            <Link href="/profile" className="hover:text-white">
              Profile
            </Link>
            <Link href="/profile/change-password" className="hover:text-white">
              Change password
            </Link>
            {user.role === USER_ROLES.SYSTEM_ADMIN && (
              <Link href="/admin/users/new" className="hover:text-white">
                Create user
              </Link>
            )}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {user && (
            <span className="hidden text-right text-xs leading-tight text-slate-300 sm:block">
              <span className="block font-medium text-white">{displayName}</span>
              <span className="block">{user.role}</span>
            </span>
          )}
          {user && <LogoutButton />}
        </div>
      </div>
    </header>
  );
}
