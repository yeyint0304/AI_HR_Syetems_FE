"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Pencil, Printer } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InvoiceEditForm } from "@/components/invoices/InvoiceEditForm";
import {
  useCancelInvoice,
  useDeleteInvoice,
  useInvoice,
  useMarkInvoicePaid,
  useSendInvoice,
  useVoidInvoice,
} from "@/hooks/useInvoices";
import { buildInvoicePdfUrl } from "@/lib/api/invoice.api";
import { INVOICE_STATUS_BADGE_CLASSES } from "@/lib/constants/invoice.constants";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";
import { formatDisplayDate } from "@/lib/utils/date";

interface InvoiceDetailViewProps {
  invoiceId: string;
}

type PendingActionType = "send" | "markPaid" | "void" | "cancel" | "delete";

function formatMoney(value: number, symbol: string | undefined): string {
  const rounded = value.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return symbol ? `${symbol} ${rounded}` : rounded;
}

const DIALOG_COPY: Record<
  PendingActionType,
  { title: string; description: string; confirmLabel: string; variant: "danger" | "primary" }
> = {
  send: {
    title: "Send invoice",
    description: "Are you sure you want to send this invoice to the client? Once sent, it can no longer be edited.",
    confirmLabel: "Send Invoice",
    variant: "primary",
  },
  markPaid: {
    title: "Mark invoice as paid",
    description: "Are you sure you want to mark this invoice as paid?",
    confirmLabel: "Mark as Paid",
    variant: "primary",
  },
  void: {
    title: "Void invoice",
    description: "Are you sure you want to void this invoice? This action cannot be undone.",
    confirmLabel: "Void Invoice",
    variant: "danger",
  },
  cancel: {
    title: "Cancel invoice",
    description: "Are you sure you want to cancel this invoice? This action cannot be undone.",
    confirmLabel: "Cancel Invoice",
    variant: "danger",
  },
  delete: {
    title: "Delete invoice",
    description: "Are you sure you want to delete this Draft invoice? This action cannot be undone.",
    confirmLabel: "Delete",
    variant: "danger",
  },
};

/**
 * `/invoices/[id]` — full invoice preview + lifecycle actions, per the
 * wireframe (`docs/HR_System_FE_wireframe.pdf`: "full invoice HTML preview
 * with dark header, line items, totals, Finalize/Cancel/Download buttons").
 * Backed by `Invoice/GetInvoiceById` and its lifecycle endpoints
 * (`Invoice/SendInvoice`, `MarkInvoicePaid`, `VoidInvoice`, `CancelInvoice`,
 * `UpdateInvoice`, `DeleteInvoice`, `GetInvoicePdf`), via `/api/invoices/[id]*`.
 *
 * Action visibility follows the real state machine documented in
 * `docs/HR_System_BE.postman_collection.json` rather than the wireframe's
 * simplified Draft/Finalized mock: Edit/Send/Delete only apply to `Draft`
 * invoices, "Mark as Paid" only to `Sent` invoices, and Void/Cancel are
 * hidden once an invoice is already in one of those terminal states.
 */
export function InvoiceDetailView({ invoiceId }: InvoiceDetailViewProps) {
  const router = useRouter();
  const { data: invoice, isLoading, isError, error, refetch } = useInvoice(invoiceId);

  const [isEditing, setIsEditing] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingActionType | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const sendInvoiceMutation = useSendInvoice(invoiceId);
  const markInvoicePaidMutation = useMarkInvoicePaid(invoiceId);
  const voidInvoiceMutation = useVoidInvoice(invoiceId);
  const cancelInvoiceMutation = useCancelInvoice(invoiceId);
  const deleteInvoiceMutation = useDeleteInvoice();

  const isMutating =
    sendInvoiceMutation.isPending ||
    markInvoicePaidMutation.isPending ||
    voidInvoiceMutation.isPending ||
    cancelInvoiceMutation.isPending ||
    deleteInvoiceMutation.isPending;

  function handleConfirm() {
    if (!pendingAction) return;
    setActionError(null);

    const onError = (mutationError: unknown, fallback: string) => {
      setActionError(getApiErrorMessage(mutationError, fallback));
    };

    if (pendingAction === "send") {
      sendInvoiceMutation.mutate(undefined, {
        onSuccess: () => setPendingAction(null),
        onError: (err) => onError(err, "Unable to send the invoice. Please try again."),
      });
      return;
    }
    if (pendingAction === "markPaid") {
      markInvoicePaidMutation.mutate(undefined, {
        onSuccess: () => setPendingAction(null),
        onError: (err) => onError(err, "Unable to mark the invoice as paid. Please try again."),
      });
      return;
    }
    if (pendingAction === "void") {
      voidInvoiceMutation.mutate(undefined, {
        onSuccess: () => setPendingAction(null),
        onError: (err) => onError(err, "Unable to void the invoice. Please try again."),
      });
      return;
    }
    if (pendingAction === "cancel") {
      cancelInvoiceMutation.mutate(undefined, {
        onSuccess: () => setPendingAction(null),
        onError: (err) => onError(err, "Unable to cancel the invoice. Please try again."),
      });
      return;
    }
    deleteInvoiceMutation.mutate(invoiceId, {
      onSuccess: () => {
        setPendingAction(null);
        router.push("/invoices");
        router.refresh();
      },
      onError: (err) => onError(err, "Unable to delete the invoice. Please try again."),
    });
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500" role="status">
        Loading invoice…
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="flex flex-col gap-3">
        <Alert variant="error">{getApiErrorMessage(error, "Unable to load this invoice.")}</Alert>
        <div>
          <Button type="button" variant="secondary" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const currencySymbol = invoice.currency.symbol;
  const taxRatePercent = invoice.subTotal > 0 ? (invoice.taxAmount / invoice.subTotal) * 100 : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-900">{invoice.invoiceNumber}</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${INVOICE_STATUS_BADGE_CLASSES[invoice.status]}`}
            >
              {invoice.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {invoice.project.name} · {invoice.clientName}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => window.print()}>
            <Printer aria-hidden="true" className="h-4 w-4" />
            Print
          </Button>
          <a
            href={buildInvoicePdfUrl(invoice.id)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            Download PDF
          </a>
          {invoice.status === "Draft" && (
            <Button type="button" variant="secondary" onClick={() => setIsEditing((prev) => !prev)}>
              <Pencil aria-hidden="true" className="h-4 w-4" />
              {isEditing ? "Close edit" : "Edit"}
            </Button>
          )}
          {invoice.status === "Draft" && (
            <Button type="button" onClick={() => setPendingAction("send")} disabled={isMutating}>
              Send Invoice
            </Button>
          )}
          {invoice.status === "Sent" && (
            <Button type="button" onClick={() => setPendingAction("markPaid")} disabled={isMutating}>
              Mark as Paid
            </Button>
          )}
          {(invoice.status === "Draft" || invoice.status === "Sent" || invoice.status === "Paid") && (
            <Button type="button" variant="danger" onClick={() => setPendingAction("void")} disabled={isMutating}>
              Void
            </Button>
          )}
          {(invoice.status === "Draft" || invoice.status === "Sent" || invoice.status === "Paid") && (
            <Button type="button" variant="danger" onClick={() => setPendingAction("cancel")} disabled={isMutating}>
              Cancel
            </Button>
          )}
          {invoice.status === "Draft" && (
            <Button type="button" variant="danger" onClick={() => setPendingAction("delete")} disabled={isMutating}>
              Delete
            </Button>
          )}
        </div>
      </div>

      {actionError && <Alert variant="error">{actionError}</Alert>}

      {isEditing && invoice.status === "Draft" && (
        <InvoiceEditForm invoice={invoice} onCancel={() => setIsEditing(false)} onSaved={() => setIsEditing(false)} />
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-slate-900 px-6 py-6 text-slate-100">
          <div className="flex flex-col justify-between gap-4 sm:flex-row">
            <div>
              <p className="text-lg font-semibold text-white">HR System Pte Ltd</p>
              <p className="mt-1 text-sm text-slate-400">123 Business Park, #08-01</p>
              <p className="text-sm text-slate-400">Singapore 123456</p>
              <p className="text-sm text-slate-400">billing@hrsystem.com</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Invoice</p>
              <p className="text-lg font-semibold text-white">{invoice.invoiceNumber}</p>
              <p className="mt-1 text-sm text-slate-400">Date: {formatDisplayDate(invoice.issuedDate)}</p>
              <p className="text-sm text-slate-400">
                Period: {formatDisplayDate(invoice.billingPeriodStart)} – {formatDisplayDate(invoice.billingPeriodEnd)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 px-6 py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bill To</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{invoice.clientName}</p>
            {invoice.clientEmail && <p className="text-sm text-slate-600">{invoice.clientEmail}</p>}
            <p className="text-sm text-slate-500">{invoice.project.name}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Payment Details</p>
            <p className="mt-1 text-sm text-slate-600">
              Currency: {invoice.currency.code} ({currencySymbol})
            </p>
            <p className="text-sm text-slate-600">Tax rate: {taxRatePercent.toFixed(0)}%</p>
            <p className="text-sm text-slate-600">Due date: {formatDisplayDate(invoice.dueDate)}</p>
            <span
              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${INVOICE_STATUS_BADGE_CLASSES[invoice.status]}`}
            >
              {invoice.status}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto border-t border-slate-200 px-6 py-4">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Invoice line items</caption>
            <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="py-2 pr-4">Resource</th>
                <th scope="col" className="py-2 pr-4">Role</th>
                <th scope="col" className="py-2 pr-4">Description</th>
                <th scope="col" className="py-2 pr-4">Hours</th>
                <th scope="col" className="py-2 pr-4">Unit Rate</th>
                <th scope="col" className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.lineItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-sm text-slate-500">
                    No line items on this invoice.
                  </td>
                </tr>
              ) : (
                invoice.lineItems.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2 pr-4 font-medium text-slate-900">{item.user.fullName || "—"}</td>
                    <td className="py-2 pr-4 text-slate-700">{item.resourceRoleType.name}</td>
                    <td className="py-2 pr-4 text-slate-600">{item.description}</td>
                    <td className="py-2 pr-4 text-slate-700">{item.hours}h</td>
                    <td className="py-2 pr-4 text-slate-700">{formatMoney(item.unitRate, currencySymbol)}</td>
                    <td className="py-2 text-right font-medium text-slate-900">
                      {formatMoney(item.amount, currencySymbol)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end border-t border-slate-200 px-6 py-4">
          <dl className="w-full max-w-xs space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Subtotal</dt>
              <dd className="font-medium text-slate-900">{formatMoney(invoice.subTotal, currencySymbol)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Tax</dt>
              <dd className="font-medium text-slate-900">{formatMoney(invoice.taxAmount, currencySymbol)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 text-base">
              <dt className="font-semibold text-slate-900">Total</dt>
              <dd className="font-semibold text-slate-900">{formatMoney(invoice.totalAmount, currencySymbol)}</dd>
            </div>
          </dl>
        </div>

        {invoice.notes && (
          <div className="border-t border-slate-200 px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Notes</p>
            <p className="mt-1 text-sm text-slate-600">{invoice.notes}</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pendingAction !== null}
        title={pendingAction ? DIALOG_COPY[pendingAction].title : ""}
        description={pendingAction ? DIALOG_COPY[pendingAction].description : ""}
        confirmLabel={pendingAction ? DIALOG_COPY[pendingAction].confirmLabel : "Confirm"}
        variant={pendingAction ? DIALOG_COPY[pendingAction].variant : "primary"}
        isConfirming={isMutating}
        onConfirm={handleConfirm}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
