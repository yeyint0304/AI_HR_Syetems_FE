import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/server/authCookies";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageInvoices } from "@/lib/constants/invoice.constants";
import { InvoiceDetailView } from "@/components/invoices/InvoiceDetailView";

export const metadata: Metadata = { title: "Invoice detail | HR System" };

interface InvoiceDetailPageProps {
  // Next.js 16: dynamic route `params` is a Promise (see
  // node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md).
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { id } = await params;
  const accessToken = await getAccessToken();
  const claims = accessToken ? decodeJwt(accessToken) : null;
  const user = claims ? mapClaimsToAuthUser(claims) : null;

  if (!user) {
    redirect("/login");
  }

  // Defense-in-depth: every `/api/invoices/[id]*` Route Handler re-checks
  // this same role requirement server-side.
  if (!canManageInvoices(user.role)) {
    redirect("/invoices");
  }

  return <InvoiceDetailView invoiceId={id} />;
}
