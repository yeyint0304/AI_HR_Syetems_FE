import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/server/authCookies";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { USER_ROLES } from "@/lib/constants/auth.constants";

export const metadata: Metadata = { title: "Dashboard | HR System" };

export default async function DashboardHomePage() {
  const accessToken = await getAccessToken();
  const claims = accessToken ? decodeJwt(accessToken) : null;
  const user = claims ? mapClaimsToAuthUser(claims) : null;

  // Defense-in-depth: `proxy.ts` already redirects unauthenticated requests
  // to `/login` at the edge, but every protected layout/page re-checks per
  // the Next.js auth guidance (never rely on the proxy alone for
  // authorization).
  if (!user) {
    redirect("/login");
  }

  const displayName = user.firstName || user.username || user.email;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Welcome, {displayName}</h1>
        <p className="mt-1 text-sm text-slate-500">
          You are signed in as <span className="font-medium text-slate-700">{user.role}</span>.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/profile"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <h2 className="text-sm font-semibold text-slate-900">Update profile</h2>
          <p className="mt-1 text-sm text-slate-500">Edit your name, email, and country.</p>
        </Link>

        <Link
          href="/profile/change-password"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <h2 className="text-sm font-semibold text-slate-900">Change password</h2>
          <p className="mt-1 text-sm text-slate-500">Update your account password.</p>
        </Link>

        {user.role === USER_ROLES.SYSTEM_ADMIN && (
          <Link
            href="/admin/users/new"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <h2 className="text-sm font-semibold text-slate-900">Create user</h2>
            <p className="mt-1 text-sm text-slate-500">Provision a new system user account.</p>
          </Link>
        )}
      </div>
    </div>
  );
}
