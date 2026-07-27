import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/server/authCookies";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { USER_ROLES } from "@/lib/constants/auth.constants";
import { RolesListView } from "@/components/roles/RolesListView";

export const metadata: Metadata = { title: "Roles | HR System" };

export default async function RolesPage() {
  const accessToken = await getAccessToken();
  const claims = accessToken ? decodeJwt(accessToken) : null;
  const user = claims ? mapClaimsToAuthUser(claims) : null;

  if (!user) {
    redirect("/login");
  }

  // Defense-in-depth: `proxy.ts` already gates the `/admin` prefix to
  // SystemAdmin, but this is UX-only gating — re-check here too, and
  // `GET /api/auth/roles` re-checks again before calling the backend (which
  // is the real authorization boundary).
  if (user.role !== USER_ROLES.SYSTEM_ADMIN) {
    redirect("/");
  }

  return <RolesListView />;
}
