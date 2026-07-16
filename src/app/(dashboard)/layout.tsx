import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/server/authCookies";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { AppHeader } from "@/components/layout/AppHeader";
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
    <div className="flex min-h-screen flex-col bg-slate-50">
      <AuthStoreHydrator user={user} />
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
