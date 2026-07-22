import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/server/authCookies";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageExchangeRates } from "@/lib/constants/exchangeRate.constants";
import { ExchangeRatesListView } from "@/components/exchangeRates/ExchangeRatesListView";

export const metadata: Metadata = { title: "Exchange Rates | HR System" };

export default async function ExchangeRatesPage() {
  const accessToken = await getAccessToken();
  const claims = accessToken ? decodeJwt(accessToken) : null;
  const user = claims ? mapClaimsToAuthUser(claims) : null;

  if (!user) {
    redirect("/login");
  }

  // Defense-in-depth: `proxy.ts` already gates the `/admin` prefix to
  // SystemAdmin, but this is UX-only gating — re-check here too, and the
  // `/api/exchange-rates` Route Handlers re-check again before calling the
  // backend (which is the real authorization boundary).
  if (!canManageExchangeRates(user.role)) {
    redirect("/");
  }

  return <ExchangeRatesListView />;
}
