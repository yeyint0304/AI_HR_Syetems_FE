import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import {
  mapBackendMonthlyCostRevenue,
  readBackendEnvelope,
  resolveEnvelopeFailure,
} from "@/lib/server/reportResponseMappers";
import { monthlyCostRevenueQuerySchema } from "@/lib/validators/report.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageReports } from "@/lib/constants/report.constants";

/**
 * GET /api/reports/cost-revenue
 * [Auth] Generates the "Monthly Cost & Revenue" report via
 * `Report/GenerateMonthlyCostRevenue` (`year`/`month` required,
 * `projectId`/`currencyId` optional).
 *
 * Restricted to `REPORT_MANAGER_ROLES` (SystemAdmin/ProjectAdmin) — see
 * `lib/constants/report.constants.ts` for the rationale (this report exposes
 * per-role billing rates, cost, revenue and margin — sensitive financial
 * data a plain `User` has no legitimate need to see).
 */
export async function GET(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to view the cost & revenue report." },
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

  if (!canManageReports(currentUser.role)) {
    return NextResponse.json(
      { message: "You do not have permission to view the cost & revenue report." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsedQuery = monthlyCostRevenueQuerySchema.safeParse({
    year: searchParams.get("year") ?? undefined,
    month: searchParams.get("month") ?? undefined,
    projectId: searchParams.get("projectId") ?? undefined,
    currencyId: searchParams.get("currencyId") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { message: "Invalid filter parameters.", errors: parsedQuery.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const response = await backendApiClient.get("/Report/GenerateMonthlyCostRevenue", {
      params: parsedQuery.data,
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const envelope = readBackendEnvelope(response.data);
    if (!envelope.isSuccess) {
      const { status, message } = resolveEnvelopeFailure(
        envelope,
        "Unable to generate the cost & revenue report.",
        502
      );
      return NextResponse.json({ message }, { status });
    }

    return NextResponse.json({ data: mapBackendMonthlyCostRevenue(envelope.data) }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to generate the cost & revenue report. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
