import { NextResponse } from "next/server";
import axios from "axios";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { toBackendCreateUserPayload } from "@/lib/server/backendPayloadMappers";
import { mapBackendUserListPage } from "@/lib/server/authResponseMappers";
import { createUserSchema, userListQuerySchema } from "@/lib/validators/auth.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { UNASSIGNED_USERS_PAGE_SIZE, USER_ROLES } from "@/lib/constants/auth.constants";

/**
 * GET /api/auth/users?search=&page=&pageSize=
 * [Auth][SystemAdmin] Lists every user via `Auth/GetUserList` (the same
 * endpoint `GET /api/auth/unassigned-users` calls for the Project
 * Assignments combobox — see that route's doc comment for the pagination/
 * search caveats, which apply here identically), mapped to the fuller
 * `UserListItem` shape (role/country/status) the `/admin/users` "User
 * Management" screen renders per the wireframe
 * (`docs/HR_System_FE_wireframe.pdf`: "table shows all... users with role
 * badges... and role count chips"). Restricted to SystemAdmin, matching the
 * `Administration` sidebar section's `requiredRole`
 * (`lib/constants/navigation.constants.ts`).
 */
export async function GET(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ message: "You must be signed in to view users." }, { status: 401 });
  }

  const claims = decodeJwt(accessToken);
  const currentUser = claims ? mapClaimsToAuthUser(claims) : null;
  if (!currentUser) {
    return NextResponse.json(
      { message: "Your session is invalid. Please sign in again." },
      { status: 401 }
    );
  }

  if (currentUser.role !== USER_ROLES.SYSTEM_ADMIN) {
    return NextResponse.json(
      { message: "You do not have permission to view users." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsedQuery = userListQuerySchema.safeParse({
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

    const result = mapBackendUserListPage(response.data, page, pageSize);
    const items = search ? filterBySearchTerm(result.items, search) : result.items;

    return NextResponse.json({ data: { ...result, items } }, { status: 200 });
  } catch (error) {
    // Mirrors `GET /api/auth/unassigned-users`'s 404-as-empty-list handling —
    // some backend deployments respond 404 when there are no users to return.
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return NextResponse.json(
        { data: { items: [], page, pageSize, totalCount: 0, hasMore: false } },
        { status: 200 }
      );
    }

    const { status, message } = normalizeBackendError(error, "Unable to load users.");
    return NextResponse.json({ message }, { status });
  }
}

/** Case-insensitive substring match across the fields visible in the `/admin/users` table. */
function filterBySearchTerm(
  users: ReturnType<typeof mapBackendUserListPage>["items"],
  search: string
): ReturnType<typeof mapBackendUserListPage>["items"] {
  const term = search.toLowerCase();
  return users.filter((user) =>
    [user.username, user.email, user.firstName, user.lastName, `${user.firstName} ${user.lastName}`, user.roleName].some(
      (field) => field.toLowerCase().includes(term)
    )
  );
}

/**
 * POST /api/auth/users
 * [Auth][SystemAdmin] Creates a new user via `Auth/CreateUser`. The
 * SystemAdmin role check is enforced here (server-side, based on the
 * decoded access token) in addition to the `proxy.ts` route-level gate and
 * the page-level check — the backend remains the ultimate authorization
 * boundary and re-validates the role independently.
 */
export async function POST(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to create a user." },
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

  if (currentUser.role !== USER_ROLES.SYSTEM_ADMIN) {
    return NextResponse.json(
      { message: "You do not have permission to create users." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Please correct the highlighted fields.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  try {
    const response = await backendApiClient.post(
      "/Auth/CreateUser",
      toBackendCreateUserPayload(parsed.data),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return NextResponse.json({ data: response.data }, { status: 201 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to create the user. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
