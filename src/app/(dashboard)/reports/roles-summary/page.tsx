import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/server/authCookies";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageReports } from "@/lib/constants/report.constants";
import { UserRolesSummaryView } from "@/components/reports/UserRolesSummaryView";

export const metadata: Metadata = { title: "User Roles Summary | HR System" };

export default async function UserRolesSummaryPage() {
  const accessToken = await getAccessToken();
  const claims = accessToken ? decodeJwt(accessToken) : null;
  const user = claims ? mapClaimsToAuthUser(claims) : null;

  if (!user) {
    redirect("/login");
  }

  // Defense-in-depth: `proxy.ts` only guards the `/admin` prefix, so this
  // report-specific role check is enforced here (UX-layer) in addition to
  // `/api/reports/roles-summary`, which re-checks independently — see
  // `lib/constants/report.constants.ts` for the rationale.
  if (!canManageReports(user.role)) {
    redirect("/reports");
  }

  return <UserRolesSummaryView />;
}
