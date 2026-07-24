import { NextResponse } from "next/server";
import axios from "axios";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { mapBackendUnassignedUserPage } from "@/lib/server/authResponseMappers";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageProjects } from "@/lib/constants/project.constants";
import { unassignedUserQuerySchema } from "@/lib/validators/auth.validators";
import { UNASSIGNED_USERS_PAGE_SIZE } from "@/lib/constants/auth.constants";
import type { UnassignedUser } from "@/types/auth.types";

/**
 * GET /api/auth/unassigned-users?search=&page=&pageSize=
 * [Auth][SystemAdmin|ProjectAdmin] Read-only reference data backing the
 * searchable, scroll-paginated "User" combobox on the Project Assignments
 * screen (`Project/AssignResource` requires a `UserId`), sourced from
 * `Auth/GetUserList` per `docs/HR_System_BE.postman_collection.json` (the
 * collection documents this exact call, for this exact purpose, under the
 * folder name "Get Unassigned User List" — the endpoint's *path* is
 * `Auth/GetUserList`; there is no `Auth/GetUnassignedUsers` route on the
 * backend at all, so calling that name 404s/errors every time). Gated to
 * the same `canManageProjects` roles as `GET /api/projects/[id]/assignments`
 * — regular users can't reach the Assignments screen at all, so there's no
 * reason to expose this list to them either.
 *
 * Note: `Auth/GetUserList` has no per-project parameter — it returns users
 * with *no* project assignment at all, backend-wide. A user already
 * assigned to a *different* project won't appear here even though they
 * could validly be added to this one too. This is a limitation of the
 * documented backend contract, not a bug in this Route Handler.
 *
 * `page`/`pageSize`/`search` handling: `Auth/GetUserList` documents *no*
 * query parameters at all (unlike e.g. `Country/GetAllCountries`, whose
 * `?page=&pageSize=` are explicitly documented) — yet the live backend
 * already returns a paginated envelope by default
 * (`Data: { TotalCount, PageNo, PageSize, Items }`, see
 * `lib/server/authResponseMappers.ts`). `page`/`pageSize` are forwarded
 * optimistically, following the same naming convention every other
 * paginated endpoint in this backend uses (harmless no-op if ignored: the
 * backend just returns its own default page/size). `search` is forwarded
 * the same way, but — since there is no documented (or precedented, across
 * this entire backend) free-text search parameter for this endpoint — a
 * case-insensitive substring filter is *also* applied here, defensively, so
 * the "User" combobox's search box works correctly even if the backend
 * silently ignores the parameter. Double-filtering already-server-filtered
 * results is a harmless no-op.
 */
export async function GET(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to view unassigned users." },
      { status: 401 }
    );
  }

  const claims = decodeJwt(accessToken);
  const currentUser = claims ? mapClaimsToAuthUser(claims) : null;
  if (!currentUser) {
    return NextResponse.json(
      { message: "Your session is invalid. Please sign in again." },
      { status: 401 }
    );
  }

  if (!canManageProjects(currentUser.role)) {
    return NextResponse.json(
      { message: "You do not have permission to view unassigned users." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsedQuery = unassignedUserQuerySchema.safeParse({
    search: searchParams.get("search") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { message: "Invalid query parameters.", errors: parsedQuery.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const page = parsedQuery.data.page ?? 1;
  const pageSize = parsedQuery.data.pageSize ?? UNASSIGNED_USERS_PAGE_SIZE;
  const search = parsedQuery.data.search;

  try {
    const response = await backendApiClient.get("/Auth/GetUserList", {
      params: { page, pageSize, ...(search ? { search } : {}) },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const result = mapBackendUnassignedUserPage(response.data, page, pageSize);
    const items = search ? filterBySearchTerm(result.items, search) : result.items;

    return NextResponse.json({ data: { ...result, items } }, { status: 200 });
  } catch (error) {
    // Some backend deployments respond 404 Not Found (rather than 200 with an
    // empty array) from `Auth/GetUserList` when every user is already
    // assigned to a project — a valid "no results" outcome, not a real error.
    // Without this, the Project Assignments "Add User to Project" section
    // surfaced a scary "Unable to load users available to assign" error alert
    // instead of the friendly "no unassigned users available" empty state
    // that `ProjectAssignmentsView` already handles for a genuinely empty list.
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return NextResponse.json(
        { data: { items: [], page, pageSize, totalCount: 0, hasMore: false } },
        { status: 200 }
      );
    }

    const { status, message } = normalizeBackendError(error, "Unable to load unassigned users.");
    return NextResponse.json({ message }, { status });
  }
}

/** Case-insensitive substring match across the fields visible in the "User" combobox's option labels. */
function filterBySearchTerm(users: UnassignedUser[], search: string): UnassignedUser[] {
  const term = search.toLowerCase();
  return users.filter((user) =>
    [user.username, user.email, user.firstName, user.lastName, `${user.firstName} ${user.lastName}`].some(
      (field) => field.toLowerCase().includes(term)
    )
  );
}
