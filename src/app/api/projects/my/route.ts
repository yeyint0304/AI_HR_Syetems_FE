import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { mapBackendProjectList } from "@/lib/server/projectResponseMappers";

/**
 * GET /api/projects/my
 * [Auth] Retrieves the signed-in user's own project list, scoped
 * server-side purely from the bearer token — via `Project/GetMyProjectList`
 * (`docs/HR_System_BE.postman_collection.json`).
 *
 * Unlike `GET /api/projects` (backs the full "Projects" catalog page —
 * deliberately org-wide for every role, including a plain `Employee`; see
 * that Route Handler's doc comment), this endpoint exists purely to feed
 * "Project" filter/select dropdowns that should only ever offer a
 * `ProjectAdmin` the project(s) they manage, or an `Employee` the project(s)
 * they're assigned to — see `hooks/useProjects.ts#useProjectSelectOptions`,
 * which is the only intended caller. A `SystemAdmin` never calls this: they
 * filter/select across every project in the org via the existing
 * `/api/projects` instead.
 *
 * Fixes the Report/Invoice/Timesheet-History "Project" filter previously
 * always listing every project in the org (via `GET /api/projects`)
 * regardless of role, which let a `ProjectAdmin` pick a project outside the
 * scope their `Report/GenerateMy*`/`Invoice/GetMyInvoices` backend calls
 * actually cover, silently producing an empty/mismatched result instead of
 * generating the report they expected.
 */
export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to view your projects." },
      { status: 401 }
    );
  }

  try {
    const response = await backendApiClient.get("/Project/GetMyProjectList", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return NextResponse.json({ data: mapBackendProjectList(response.data) }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to load your projects. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
