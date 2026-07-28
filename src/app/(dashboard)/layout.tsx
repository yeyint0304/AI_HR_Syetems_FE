import { redirect } from "next/navigation";
import { getCurrentAuthUser } from "@/lib/server/authCookies";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { AuthStoreHydrator } from "@/components/providers/AuthStoreHydrator";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentAuthUser();

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
