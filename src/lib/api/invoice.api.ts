import { apiClient } from "@/lib/api/axiosInstance";
import type {
  GenerateInvoiceRequest,
  GenerateInvoiceResult,
  InvoiceDetail,
  InvoiceList,
  InvoiceListFilters,
  InvoiceStatusChangeResult,
  UpdateInvoiceRequest,
  UpdateInvoiceResult,
} from "@/types/invoice.types";

/**
 * Invoice domain repository, per the layering convention documented in
 * `lib/api/project.api.ts`: every HTTP call for the Invoice feature goes
 * through this module (which talks to this app's own `/api/invoices/*` Route
 * Handlers — never the .NET backend directly). Components never call
 * axios/fetch directly.
 *
 * `buildInvoicePdfUrl` only builds a URL for a browser-native navigation
 * (`<a href="...">`), following the same pattern as
 * `lib/api/report.api.ts#buildTimesheetReportExportUrl` for downloading a
 * binary file while still sending the httpOnly auth cookie automatically.
 */

export async function getInvoiceListRequest(filters?: InvoiceListFilters): Promise<InvoiceList> {
  const { data } = await apiClient.get<{ data: InvoiceList }>("/invoices", { params: filters });
  return data.data;
}

export async function getInvoiceRequest(id: string): Promise<InvoiceDetail> {
  const { data } = await apiClient.get<{ data: InvoiceDetail }>(`/invoices/${id}`);
  return data.data;
}

export async function generateInvoiceRequest(
  payload: GenerateInvoiceRequest
): Promise<GenerateInvoiceResult> {
  const { data } = await apiClient.post<{ data: GenerateInvoiceResult }>("/invoices", payload);
  return data.data;
}

export async function updateInvoiceRequest(
  id: string,
  payload: UpdateInvoiceRequest
): Promise<UpdateInvoiceResult> {
  const { data } = await apiClient.put<{ data: UpdateInvoiceResult }>(`/invoices/${id}`, payload);
  return data.data;
}

export async function deleteInvoiceRequest(id: string): Promise<void> {
  await apiClient.delete(`/invoices/${id}`);
}

export async function sendInvoiceRequest(id: string): Promise<InvoiceStatusChangeResult> {
  const { data } = await apiClient.put<{ data: InvoiceStatusChangeResult }>(`/invoices/${id}/send`);
  return data.data;
}

export async function markInvoicePaidRequest(id: string): Promise<InvoiceStatusChangeResult> {
  const { data } = await apiClient.put<{ data: InvoiceStatusChangeResult }>(
    `/invoices/${id}/mark-paid`
  );
  return data.data;
}

export async function voidInvoiceRequest(id: string): Promise<InvoiceStatusChangeResult> {
  const { data } = await apiClient.put<{ data: InvoiceStatusChangeResult }>(`/invoices/${id}/void`);
  return data.data;
}

export async function cancelInvoiceRequest(id: string): Promise<InvoiceStatusChangeResult> {
  const { data } = await apiClient.put<{ data: InvoiceStatusChangeResult }>(`/invoices/${id}/cancel`);
  return data.data;
}

/** Builds the download URL for `GET /api/invoices/[id]/pdf`. Performs no I/O itself. */
export function buildInvoicePdfUrl(id: string): string {
  return `/api/invoices/${id}/pdf`;
}
