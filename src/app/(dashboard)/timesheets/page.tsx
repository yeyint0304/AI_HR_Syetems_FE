import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/server/authCookies";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { MyTimesheetView } from "@/components/timesheets/MyTimesheetView";

export const metadata: Metadata = { title: "My Timesheets | HR System" };

export default async function MyTimesheetsPage() {
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

  // `currentUserId` is resolved here (server-side, from the decoded JWT
  // cookie) rather than read from the client-side auth store inside
  // `MyTimesheetView` — this guarantees the timesheet grid always scopes
  // itself to the actual signed-in user, with no dependency on client-side
  // store hydration timing.
  return <MyTimesheetView currentUserId={user.id} />;
}
