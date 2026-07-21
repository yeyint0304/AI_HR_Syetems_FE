import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/server/authCookies";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageInvoices } from "@/lib/constants/invoice.constants";
import { InvoiceGenerateForm } from "@/components/invoices/InvoiceGenerateForm";

export const metadata: Metadata = { title: "Generate Invoice | HR System" };

export default async function GenerateInvoicePage() {
  const accessToken = await getAccessToken();
  const claims = accessToken ? decodeJwt(accessToken) : null;
  const user = claims ? mapClaimsToAuthUser(claims) : null;

  if (!user) {
    redirect("/login");
  }

  // Defense-in-depth: `POST /api/invoices` re-checks this same role
  // requirement server-side, and the .NET backend remains the ultimate
  // authorization boundary.
  if (!canManageInvoices(user.role)) {
    redirect("/invoices");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900">Generate Invoice</h1>
      <p className="mt-1 text-sm text-slate-500">Create a new invoice from approved timesheet entries.</p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <InvoiceGenerateForm />
      </div>
    </div>
  );
}
