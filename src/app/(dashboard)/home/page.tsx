import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, Clock, FileText, FolderKanban, Receipt, Users, type LucideIcon } from "lucide-react";
import { getAccessToken } from "@/lib/server/authCookies";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { USER_ROLES } from "@/lib/constants/auth.constants";
import { TotalProjectsStat } from "@/components/home/TotalProjectsStat";

export const metadata: Metadata = { title: "Dashboard | HR System" };

/**
 * Summary/activity data below is placeholder mock data, matching the
 * dashboard wireframe (`docs/HR_System_FE_wireframe.pdf`, which itself notes
 * "Data is hardcoded JSON"). Timesheet/Invoice domains don't have `lib/api`
 * modules wired into this page yet — wiring those cards up to the real
 * backend remains out of scope for this change.
 *
 * "Total Projects" is the one exception: per the `feature/user-deactivate`
 * request ("On the Dashboard and Project pages, fix the API so only the
 * user's own project appears"), that card is now backed by live,
 * role-scoped data (`components/home/TotalProjectsStat.tsx`) rather than the
 * hardcoded value below — see that component's doc comment.
 */
interface SummaryStat {
  label: string;
  value: string;
  trend: string;
  trendTone: "positive" | "neutral" | "warning";
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

const SUMMARY_STATS: SummaryStat[] = [
  {
    label: "Hours This Week",
    value: "24",
    trend: "Across all projects",
    trendTone: "neutral",
    icon: Clock,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  {
    label: "Pending Invoices",
    value: "1",
    trend: "Awaiting finalization",
    trendTone: "warning",
    icon: Receipt,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    label: "Active Users",
    value: "3",
    trend: "All roles",
    trendTone: "neutral",
    icon: Users,
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
  },
];

const TREND_TONE_CLASSES: Record<SummaryStat["trendTone"], string> = {
  positive: "text-green-600",
  neutral: "text-slate-500",
  warning: "text-amber-600",
};

type EntryStatus = "Approved" | "Pending" | "Draft";

const STATUS_BADGE_CLASSES: Record<EntryStatus, string> = {
  Approved: "bg-green-50 text-green-700",
  Pending: "bg-amber-50 text-amber-700",
  Draft: "bg-slate-100 text-slate-600",
};

function StatusBadge({ status }: { status: EntryStatus }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[status]}`}
    >
      {status}
    </span>
  );
}

interface TimesheetEntry {
  id: string;
  project: string;
  task: string;
  date: string;
  hours: number;
  status: EntryStatus;
}

const RECENT_TIMESHEET_ENTRIES: TimesheetEntry[] = [
  {
    id: "1",
    project: "Project Alpha - Web Platform",
    task: "Frontend component development",
    date: "2025-02-24",
    hours: 6,
    status: "Approved",
  },
  {
    id: "2",
    project: "Project Beta - Mobile App",
    task: "API integration testing",
    date: "2025-02-24",
    hours: 2,
    status: "Pending",
  },
  {
    id: "3",
    project: "Project Alpha - Web Platform",
    task: "Database schema optimization",
    date: "2025-02-25",
    hours: 7,
    status: "Approved",
  },
  {
    id: "4",
    project: "Project Beta - Mobile App",
    task: "Bug fixes",
    date: "2025-02-25",
    hours: 1,
    status: "Pending",
  },
];

interface InvoiceSummary {
  id: string;
  number: string;
  client: string;
  amount: string;
  status: EntryStatus;
}

const RECENT_INVOICES: InvoiceSummary[] = [
  {
    id: "1",
    number: "INV-202502-0001",
    client: "Acme Corp",
    amount: "SGD 8,400.00",
    status: "Draft",
  },
];

interface QuickAction {
  label: string;
  icon: LucideIcon;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Log Time", icon: Clock },
  { label: "View Reports", icon: BarChart3 },
  { label: "Generate Invoice", icon: FileText },
  { label: "Manage Projects", icon: FolderKanban },
];

export default async function DashboardHomePage() {
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

  const displayName = user.firstName || user.username || user.email;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Good morning, {displayName} <span aria-hidden="true">👋</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Here&rsquo;s what&rsquo;s happening with your projects today. You are signed in as{" "}
          <span className="font-medium text-slate-700">{user.role}</span>.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TotalProjectsStat />
        {SUMMARY_STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span
                aria-hidden="true"
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.iconBg}`}
              >
                <Icon className={`h-5 w-5 ${stat.iconColor}`} />
              </span>
              <p className="mt-3 text-2xl font-semibold text-slate-900">{stat.value}</p>
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className={`mt-2 text-xs font-medium ${TREND_TONE_CLASSES[stat.trendTone]}`}>
                {stat.trend}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section
          aria-labelledby="recent-timesheets-heading"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2"
        >
          <div className="flex items-center justify-between">
            <h2 id="recent-timesheets-heading" className="text-sm font-semibold text-slate-900">
              Recent Timesheet Entries
            </h2>
            <span
              aria-disabled="true"
              title="Coming soon"
              className="text-xs font-medium text-slate-400"
            >
              View all
            </span>
          </div>

          {RECENT_TIMESHEET_ENTRIES.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No timesheet entries yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {RECENT_TIMESHEET_ENTRIES.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{entry.project}</p>
                    <p className="truncate text-xs text-slate-500">{entry.task}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-slate-400">{entry.date}</span>
                    <span className="text-sm font-medium text-slate-700">{entry.hours}h</span>
                    <StatusBadge status={entry.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          aria-labelledby="quick-actions-heading"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 id="quick-actions-heading" className="text-sm font-semibold text-slate-900">
            Quick Actions
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  disabled
                  aria-disabled="true"
                  title={`${action.label} — coming soon`}
                  className="flex cursor-not-allowed flex-col items-center gap-2 rounded-lg border border-slate-200 px-3 py-4 text-center text-xs font-medium text-slate-400 opacity-70"
                >
                  <Icon aria-hidden="true" className="h-5 w-5" />
                  {action.label}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <section
        aria-labelledby="recent-invoices-heading"
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <h2 id="recent-invoices-heading" className="text-sm font-semibold text-slate-900">
            Recent Invoices
          </h2>
          <span aria-disabled="true" title="Coming soon" className="text-xs font-medium text-slate-400">
            View all
          </span>
        </div>

        {RECENT_INVOICES.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No invoices yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {RECENT_INVOICES.map((invoice) => (
              <li key={invoice.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{invoice.number}</p>
                  <p className="truncate text-xs text-slate-500">{invoice.client}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-medium text-slate-700">{invoice.amount}</span>
                  <StatusBadge status={invoice.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="account-heading" className="flex flex-col gap-3">
        <h2 id="account-heading" className="text-sm font-semibold text-slate-900">
          Account
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/profile"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <h3 className="text-sm font-semibold text-slate-900">Update profile</h3>
            <p className="mt-1 text-sm text-slate-500">Edit your name, email, and country.</p>
          </Link>

          <Link
            href="/profile/change-password"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <h3 className="text-sm font-semibold text-slate-900">Change password</h3>
            <p className="mt-1 text-sm text-slate-500">Update your account password.</p>
          </Link>

          {user.role === USER_ROLES.SYSTEM_ADMIN && (
            <Link
              href="/admin/users/new"
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              <h3 className="text-sm font-semibold text-slate-900">Create user</h3>
              <p className="mt-1 text-sm text-slate-500">Provision a new system user account.</p>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
