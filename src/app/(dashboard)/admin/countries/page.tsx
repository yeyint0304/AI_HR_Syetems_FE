import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/server/authCookies";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageCountries } from "@/lib/constants/country.constants";
import { CountriesListView } from "@/components/countries/CountriesListView";

export const metadata: Metadata = { title: "Countries | HR System" };

export default async function CountriesPage() {
  const accessToken = await getAccessToken();
  const claims = accessToken ? decodeJwt(accessToken) : null;
  const user = claims ? mapClaimsToAuthUser(claims) : null;

  if (!user) {
    redirect("/login");
  }

  // Defense-in-depth: `proxy.ts` already gates the `/admin` prefix to
  // SystemAdmin, but this is UX-only gating — re-check here too, and the
  // `/api/countries` mutation Route Handlers re-check again before calling
  // the backend (which is the real authorization boundary).
  if (!canManageCountries(user.role)) {
    redirect("/");
  }

  return <CountriesListView />;
}
