import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/server/authCookies";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageResourceRoleTypes } from "@/lib/constants/resourceRoleType.constants";
import { ResourceRoleTypesListView } from "@/components/resourceRoleTypes/ResourceRoleTypesListView";

export const metadata: Metadata = { title: "Resource Role Types | HR System" };

export default async function ResourceRoleTypesPage() {
  const accessToken = await getAccessToken();
  const claims = accessToken ? decodeJwt(accessToken) : null;
  const user = claims ? mapClaimsToAuthUser(claims) : null;

  if (!user) {
    redirect("/login");
  }

  // Defense-in-depth: `proxy.ts` already gates the `/admin` prefix to
  // SystemAdmin, but this is UX-only gating — re-check here too, and the
  // `/api/resource-role-types` mutation Route Handlers re-check again before
  // calling the backend (which is the real authorization boundary).
  if (!canManageResourceRoleTypes(user.role)) {
    redirect("/");
  }

  return <ResourceRoleTypesListView />;
}
