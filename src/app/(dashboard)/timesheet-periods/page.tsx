import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/server/authCookies";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { TimesheetPeriodsListView } from "@/components/timesheetPeriods/TimesheetPeriodsListView";

export const metadata: Metadata = { title: "Timesheet Periods | HR System" };

export default async function TimesheetPeriodsPage() {
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

  return <TimesheetPeriodsListView />;
}
