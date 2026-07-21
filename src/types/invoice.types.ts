/**
 * Shared Invoice domain types (Data Transfer Objects), following the same
 * minimal-surface convention as `types/report.types.ts` / `types/project.types.ts`:
 * only the fields the UI actually renders are exposed to client code.
 *
 * Field set is derived from the confirmed request/response examples in
 * `docs/HR_System_BE.postman_collection.json` for the `Invoice` module
 * (`Invoice/GenerateInvoice`, `Invoice/GetAllInvoices`, `Invoice/GetInvoiceById`,
 * `Invoice/UpdateInvoice`, `Invoice/SendInvoice`, `Invoice/MarkInvoicePaid`,
 * `Invoice/VoidInvoice`, `Invoice/CancelInvoice`, `Invoice/DeleteInvoice`).
 */

/** Documented values for `status` on `Invoice/GetAllInvoices` (`?status=Draft`). */
export type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Void" | "Cancelled";

/** Lightweight project reference embedded in invoice rows. */
export interface InvoiceProjectRef {
  id: string;
  code: string;
  name: string;
}

/** Lightweight currency reference embedded in invoice rows (list rows omit `id`). */
export interface InvoiceCurrencyRef {
  id?: string;
  code: string;
  symbol: string;
}

/** Lightweight user reference embedded in an invoice line item. */
export interface InvoiceLineItemUserRef {
  id: string;
  fullName: string;
  employeeId?: string;
}

/** Lightweight resource-role-type reference embedded in an invoice line item. */
export interface InvoiceLineItemRoleRef {
  id: string;
  name: string;
}

export interface InvoiceLineItem {
  id: string;
  user: InvoiceLineItemUserRef;
  resourceRoleType: InvoiceLineItemRoleRef;
  timesheetEntryId: string;
  description: string;
  hours: number;
  unitRate: number;
  amount: number;
}

/** A single row of `Invoice/GetAllInvoices`'s paginated `Items` array. */
export interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  project: InvoiceProjectRef;
  clientName: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  currency: InvoiceCurrencyRef;
  totalAmount: number;
  status: InvoiceStatus;
  issuedDate?: string | null;
  dueDate?: string | null;
}

export interface InvoiceList {
  items: InvoiceListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/** Full detail payload returned by `Invoice/GetInvoiceById`. */
export interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  project: InvoiceProjectRef;
  clientName: string;
  clientEmail?: string | null;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  currency: InvoiceCurrencyRef;
  exchangeRate: number;
  subTotal: number;
  taxAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  issuedDate?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  lineItems: InvoiceLineItem[];
  createdAt?: string;
}

/** Compact response returned right after `Invoice/GenerateInvoice`. */
export interface GenerateInvoiceResult {
  id: string;
  invoiceNumber: string;
  projectId: string;
  projectName: string;
  clientName: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  currency: InvoiceCurrencyRef;
  exchangeRate: number;
  subTotal: number;
  taxAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  lineItemCount: number;
}

/** Matches the request body documented on `Invoice/GenerateInvoice`. */
export interface GenerateInvoiceRequest {
  projectId: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  currencyId: string;
  clientName: string;
  clientEmail?: string;
  issuedDate?: string;
  dueDate?: string;
  notes?: string;
}

/** Matches the request body documented on `Invoice/UpdateInvoice` — every field is optional. */
export interface UpdateInvoiceRequest {
  currencyId?: string;
  clientName?: string;
  clientEmail?: string;
  issuedDate?: string;
  dueDate?: string;
  notes?: string;
}

/** Response shape returned by `Invoice/UpdateInvoice`. */
export interface UpdateInvoiceResult {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string | null;
  issuedDate?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  status: InvoiceStatus;
}

/** Shared response shape for `SendInvoice`/`MarkInvoicePaid`/`VoidInvoice`/`CancelInvoice`. */
export interface InvoiceStatusChangeResult {
  id: string;
  status: InvoiceStatus;
}

/** Matches the optional query params documented on `Invoice/GetAllInvoices`. */
export interface InvoiceListFilters {
  projectId?: string;
  status?: InvoiceStatus;
  startDate?: string;
  endDate?: string;
  currencyId?: string;
  page?: number;
  pageSize?: number;
}
