import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/server/authCookies";
import { fetchReportExport } from "@/lib/server/reportExport";
import {
  monthlyCostRevenueQuerySchema,
  reportExportFormatSchema,
} from "@/lib/validators/report.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageReports } from "@/lib/constants/report.constants";

/**
 * GET /api/reports/cost-revenue/export
 * [Auth] Exports the "Monthly Cost & Revenue" report as a file via
 * `Report/ExportMonthlyCostRevenue` (`format=xlsx|csv`, default `xlsx`).
 * Same `REPORT_MANAGER_ROLES` restriction as `GET /api/reports/cost-revenue`.
 */
export async function GET(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to export the cost & revenue report." },
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
      { message: "You do not have permission to export the cost & revenue report." },
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

  const parsedFormat = reportExportFormatSchema.safeParse(searchParams.get("format") ?? "xlsx");
  if (!parsedFormat.success) {
    return NextResponse.json({ message: "format must be 'xlsx' or 'csv'." }, { status: 400 });
  }

  const format = parsedFormat.data;

  return fetchReportExport({
    backendPath: "/Report/ExportMonthlyCostRevenue",
    params: { ...parsedQuery.data, format },
    accessToken,
    format,
    filename: `cost-revenue-report_${parsedQuery.data.year}-${String(parsedQuery.data.month).padStart(2, "0")}.${format}`,
    fallbackMessage: "Unable to export the cost & revenue report. Please try again.",
  });
}
