import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/server/authCookies";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { AuthStoreHydrator } from "@/components/providers/AuthStoreHydrator";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const accessToken = await getAccessToken();
  const claims = accessToken ? decodeJwt(accessToken) : null;
  const user = claims ? mapClaimsToAuthUser(claims) : null;

  // Defense-in-depth: `proxy.ts` already redirects unauthenticated requests,
  // but every protected layout/page re-checks per the Next.js auth guidance
  // (never rely on the proxy alone for authorization).
  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <AuthStoreHydrator user={user} />
      <DashboardShell user={user}>{children}</DashboardShell>
    </>
  );
}
