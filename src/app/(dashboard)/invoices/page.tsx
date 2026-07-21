import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/server/authCookies";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageInvoices } from "@/lib/constants/invoice.constants";
import { InvoicesListView } from "@/components/invoices/InvoicesListView";

export const metadata: Metadata = { title: "Invoices | HR System" };

export default async function InvoicesPage() {
  const accessToken = await getAccessToken();
  const claims = accessToken ? decodeJwt(accessToken) : null;
  const user = claims ? mapClaimsToAuthUser(claims) : null;

  // Defense-in-depth: `proxy.ts` only guards the `/admin` prefix, so this
  // module-specific role check is enforced here (UX-layer) in addition to
  // every `/api/invoices*` Route Handler, which re-checks independently —
  // see `lib/constants/invoice.constants.ts` for the rationale.
  if (!user) {
    redirect("/login");
  }

  if (!canManageInvoices(user.role)) {
    redirect("/home");
  }

  return <InvoicesListView />;
}
