import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/server/authCookies";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageRateCards } from "@/lib/constants/rateCard.constants";
import { RateCardsListView } from "@/components/rateCards/RateCardsListView";

export const metadata: Metadata = { title: "Rate Cards | HR System" };

export default async function RateCardsPage() {
  const accessToken = await getAccessToken();
  const claims = accessToken ? decodeJwt(accessToken) : null;
  const user = claims ? mapClaimsToAuthUser(claims) : null;

  if (!user) {
    redirect("/login");
  }

  // Defense-in-depth: `proxy.ts` already gates the `/admin` prefix to
  // SystemAdmin, but this is UX-only gating — re-check here too, and the
  // `/api/rate-cards` Route Handlers re-check again before calling the
  // backend (which is the real authorization boundary).
  if (!canManageRateCards(user.role)) {
    redirect("/");
  }

  return <RateCardsListView />;
}
