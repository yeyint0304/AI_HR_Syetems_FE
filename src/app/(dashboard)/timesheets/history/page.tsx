import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/server/authCookies";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { TimesheetHistoryView } from "@/components/timesheets/TimesheetHistoryView";

export const metadata: Metadata = { title: "Timesheet History | HR System" };

export default async function TimesheetHistoryPage() {
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
  // `TimesheetHistoryView` — this guarantees the history view always scopes
  // itself to the actual signed-in user, with no dependency on client-side
  // store hydration timing (same convention as `timesheets/page.tsx`).
  return <TimesheetHistoryView currentUserId={user.id} />;
}
