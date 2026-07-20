"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { canManageReports, REPORT_HUB_ITEMS } from "@/lib/constants/report.constants";

/**
 * `/reports` — hub of clickable report cards, per the wireframe
 * (`docs/HR_System_FE_wireframe.pdf`: "hub with 3 clickable report cards").
 * "User Roles Summary" and "Cost & Revenue Report" are only shown to
 * SystemAdmin/ProjectAdmin (`canManageReports`) — a plain `User` only sees
 * the Timesheet Report card. Each destination page independently re-checks
 * this server-side (defense-in-depth), so this is UX-layer gating only.
 */
export function ReportsHubView() {
  const { user } = useAuth();
  const visibleItems = REPORT_HUB_ITEMS.filter(
    (item) => !item.managerOnly || canManageReports(user?.role)
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">
          Generate and export reports across timesheets, roles, and financials.
        </p>
      </div>

      {visibleItems.length === 0 ? (
        <p className="text-sm text-slate-500">No reports are available for your role.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-blue-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">{item.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                </div>
                <ul aria-label={`${item.title} tags`} className="flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
                <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-blue-600 group-hover:text-blue-700">
                  View Report <span aria-hidden="true">→</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
