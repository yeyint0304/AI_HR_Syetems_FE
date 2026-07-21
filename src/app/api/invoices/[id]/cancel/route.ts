import { handleInvoiceStatusTransition } from "@/lib/server/invoiceStatusTransition";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/invoices/[id]/cancel
 * [Auth][SystemAdmin|ProjectAdmin] Cancels an invoice regardless of its
 * current status via `Invoice/CancelInvoice`. No request body required.
 */
export async function PUT(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  return handleInvoiceStatusTransition(
    id,
    "/Invoice/CancelInvoice",
    "You must be signed in to cancel this invoice.",
    "You do not have permission to cancel invoices.",
    "Unable to cancel the invoice. Please try again."
  );
}
