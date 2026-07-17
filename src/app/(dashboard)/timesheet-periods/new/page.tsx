import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/server/authCookies";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageTimesheetPeriods } from "@/lib/constants/timesheetPeriod.constants";
import { TimesheetPeriodForm } from "@/components/timesheetPeriods/TimesheetPeriodForm";

export const metadata: Metadata = { title: "New timesheet period | HR System" };

export default async function NewTimesheetPeriodPage() {
  const accessToken = await getAccessToken();
  const claims = accessToken ? decodeJwt(accessToken) : null;
  const user = claims ? mapClaimsToAuthUser(claims) : null;

  if (!user) {
    redirect("/login");
  }

  // Defense-in-depth: `POST /api/timesheet-periods` re-checks this same role
  // requirement server-side, and the .NET backend remains the ultimate
  // authorization boundary.
  if (!canManageTimesheetPeriods(user.role)) {
    redirect("/timesheet-periods");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900">New Timesheet Period</h1>
      <p className="mt-1 text-sm text-slate-500">Create a new payroll timesheet period.</p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <TimesheetPeriodForm />
      </div>
    </div>
  );
}
