import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/server/authCookies";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageCurrencies } from "@/lib/constants/currency.constants";
import { CurrenciesListView } from "@/components/currencies/CurrenciesListView";

export const metadata: Metadata = { title: "Currencies | HR System" };

export default async function CurrenciesPage() {
  const accessToken = await getAccessToken();
  const claims = accessToken ? decodeJwt(accessToken) : null;
  const user = claims ? mapClaimsToAuthUser(claims) : null;

  if (!user) {
    redirect("/login");
  }

  // Defense-in-depth: `proxy.ts` already gates the `/admin` prefix to
  // SystemAdmin, but this is UX-only gating — re-check here too, and the
  // `/api/currencies` mutation Route Handlers re-check again before calling
  // the backend (which is the real authorization boundary).
  if (!canManageCurrencies(user.role)) {
    redirect("/");
  }

  return <CurrenciesListView />;
}
