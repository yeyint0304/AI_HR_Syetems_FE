"use client";

import { FolderKanban } from "lucide-react";
import { useProjectSelectOptions } from "@/hooks/useProjects";

/**
 * "Total Projects" summary card on the `/home` dashboard
 * (`app/(dashboard)/home/page.tsx`). Per the `feature/user-deactivate`
 * request ("On the Dashboard and Project pages, fix the API so only the
 * user's own project appears"), this card is wired to the same
 * role-scoped `useProjectSelectOptions` hook every other "Project" filter in
 * this app uses (`components/projects/ProjectsListView.tsx`,
 * `TimesheetHistoryView`, report/invoice filters): a `SystemAdmin` sees the
 * full org-wide project count, while a `ProjectAdmin`/`Employee` only ever
 * sees the count of their *own* project(s) — never every project in the
 * system.
 *
 * A dedicated client component (rather than fetching inline in the
 * server-rendered `DashboardHomePage`) because `useProjectSelectOptions` is a
 * TanStack Query hook backed by the browser-only `apiClient`
 * (`lib/api/axiosInstance.ts`, relative `/api` base URL + cookie
 * credentials) — the same reason every other live-data card in this app
 * (e.g. `ProjectsListView`) is a client component. The three other summary
 * cards on this page remain static placeholder data — only "Total Projects"
 * is in scope for this fix.
 */
export function TotalProjectsStat() {
  const { data: projects, isLoading, isError } = useProjectSelectOptions();

  const value = isLoading ? "…" : isError ? "—" : String(projects?.length ?? 0);
  const trend = isError ? "Unable to load" : "Your projects";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <span
        aria-hidden="true"
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50"
      >
        <FolderKanban className="h-5 w-5 text-blue-600" />
      </span>
      <p className="mt-3 text-2xl font-semibold text-slate-900" aria-live="polite">
        {value}
      </p>
      <p className="text-sm text-slate-500">Total Projects</p>
      <p className={`mt-2 text-xs font-medium ${isError ? "text-amber-600" : "text-slate-500"}`}>{trend}</p>
    </div>
  );
}
