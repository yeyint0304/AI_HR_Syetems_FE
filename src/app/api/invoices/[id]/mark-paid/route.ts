import { handleInvoiceStatusTransition } from "@/lib/server/invoiceStatusTransition";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/invoices/[id]/mark-paid
 * [Auth][SystemAdmin|ProjectAdmin] Transitions a Sent invoice to `Paid` via
 * `Invoice/MarkInvoicePaid`. No request body required.
 */
export async function PUT(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  return handleInvoiceStatusTransition(
    id,
    "/Invoice/MarkInvoicePaid",
    "You must be signed in to mark this invoice as paid.",
    "You do not have permission to mark invoices as paid.",
    "Unable to mark the invoice as paid. Please try again."
  );
}
