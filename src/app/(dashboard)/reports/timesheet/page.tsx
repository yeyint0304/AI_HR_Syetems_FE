import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/server/authCookies";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { TimesheetReportView } from "@/components/reports/TimesheetReportView";

export const metadata: Metadata = { title: "Timesheet Report | HR System" };

export default async function TimesheetReportPage() {
  const accessToken = await getAccessToken();
  const claims = accessToken ? decodeJwt(accessToken) : null;
  const user = claims ? mapClaimsToAuthUser(claims) : null;

  // Defense-in-depth: `proxy.ts` already redirects unauthenticated requests
  // to `/login` at the edge, but every protected layout/page re-checks per
  // the Next.js auth guidance (never rely on the proxy alone for
  // authorization). Any authenticated role may view this report — the
  // `/api/reports/timesheet` Route Handler self-scopes non-privileged users
  // to their own rows (see that handler's docblock).
  if (!user) {
    redirect("/login");
  }

  return <TimesheetReportView />;
}
