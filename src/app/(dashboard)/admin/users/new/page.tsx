import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/server/authCookies";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { USER_ROLES } from "@/lib/constants/auth.constants";
import { CreateUserForm } from "@/components/auth/CreateUserForm";

export const metadata: Metadata = { title: "Create user | HR System" };

export default async function CreateUserPage() {
  const accessToken = await getAccessToken();
  const claims = accessToken ? decodeJwt(accessToken) : null;
  const user = claims ? mapClaimsToAuthUser(claims) : null;

  if (!user) {
    redirect("/login");
  }

  // Defense-in-depth: `proxy.ts` already gates the `/admin` prefix to
  // SystemAdmin, but this is UX-only gating — re-check here too, and the
  // `/api/auth/users` Route Handler re-checks again before calling the
  // backend (which is the real authorization boundary).
  if (user.role !== USER_ROLES.SYSTEM_ADMIN) {
    redirect("/");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900">Create user</h1>
      <p className="mt-1 text-sm text-slate-500">Provision a new account for the HR System.</p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <CreateUserForm />
      </div>
    </div>
  );
}
