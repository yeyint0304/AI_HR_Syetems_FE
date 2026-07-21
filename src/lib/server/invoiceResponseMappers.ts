import "server-only";
import { readBackendEnvelope, resolveEnvelopeFailure } from "@/lib/server/backendEnvelope";
import type { BackendEnvelope } from "@/lib/server/backendEnvelope";
import type {
  GenerateInvoiceResult,
  InvoiceCurrencyRef,
  InvoiceDetail,
  InvoiceLineItem,
  InvoiceLineItemRoleRef,
  InvoiceLineItemUserRef,
  InvoiceList,
  InvoiceListItem,
  InvoiceProjectRef,
  InvoiceStatus,
  InvoiceStatusChangeResult,
  UpdateInvoiceResult,
} from "@/types/invoice.types";

/**
 * Normalizes the .NET backend's `Invoice/*` response shapes into the
 * camelCase DTOs this app renders, following the same convention as
 * `lib/server/reportResponseMappers.ts` / `lib/server/timesheetEntryResponseMappers.ts`.
 *
 * `docs/HR_System_BE.postman_collection.json` includes concrete saved
 * examples for every `Invoice/*` endpoint, all wrapped in the standard
 * envelope: `{ StatusCode, IsSuccess, Message, Data }`.
 */

export { readBackendEnvelope, resolveEnvelopeFailure };
export type { BackendEnvelope };

function asObject(raw: unknown): Record<string, unknown> | null {
  return typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : null;
}

function asArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const obj = asObject(raw);
  if (obj) {
    if (Array.isArray(obj.Items)) return obj.Items;
    if (Array.isArray(obj.items)) return obj.items;
  }
  return [];
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asStatus(value: unknown): InvoiceStatus {
  const allowed: InvoiceStatus[] = ["Draft", "Sent", "Paid", "Void", "Cancelled"];
  return typeof value === "string" && (allowed as string[]).includes(value)
    ? (value as InvoiceStatus)
    : "Draft";
}

/* ------------------------------------------------------------------------ */
/* Shared reference-object mappers                                          */
/* ------------------------------------------------------------------------ */

interface RawProjectRef {
  Id?: string;
  id?: string;
  Code?: string;
  code?: string;
  Name?: string;
  name?: string;
}

function mapProjectRef(raw: unknown): InvoiceProjectRef | null {
  const r = asObject(raw) as RawProjectRef | null;
  if (!r) return null;
  const id = r.Id ?? r.id;
  if (!id) return null;
  return { id, code: r.Code ?? r.code ?? "", name: r.Name ?? r.name ?? "" };
}

interface RawCurrencyRef {
  Id?: string;
  id?: string;
  Code?: string;
  code?: string;
  Symbol?: string;
  symbol?: string;
}

function mapCurrencyRef(raw: unknown): InvoiceCurrencyRef {
  const r = (asObject(raw) as RawCurrencyRef | null) ?? {};
  return { id: r.Id ?? r.id, code: r.Code ?? r.code ?? "", symbol: r.Symbol ?? r.symbol ?? "" };
}

interface RawUserRef {
  Id?: string;
  id?: string;
  FullName?: string;
  fullName?: string;
  EmployeeId?: string;
  employeeId?: string;
}

function mapLineItemUserRef(raw: unknown): InvoiceLineItemUserRef | null {
  const r = asObject(raw) as RawUserRef | null;
  if (!r) return null;
  const id = r.Id ?? r.id;
  if (!id) return null;
  return { id, fullName: r.FullName ?? r.fullName ?? "", employeeId: r.EmployeeId ?? r.employeeId };
}

interface RawRoleRef {
  Id?: string;
  id?: string;
  Name?: string;
  name?: string;
}

function mapLineItemRoleRef(raw: unknown): InvoiceLineItemRoleRef | null {
  const r = asObject(raw) as RawRoleRef | null;
  if (!r) return null;
  const id = r.Id ?? r.id;
  if (!id) return null;
  return { id, name: r.Name ?? r.name ?? "" };
}

/* ------------------------------------------------------------------------ */
/* List — `Invoice/GetAllInvoices`                                           */
/* ------------------------------------------------------------------------ */

interface RawInvoiceListItem {
  Id?: string;
  id?: string;
  InvoiceNumber?: string;
  invoiceNumber?: string;
  Project?: unknown;
  project?: unknown;
  ClientName?: string;
  clientName?: string;
  BillingPeriodStart?: string;
  billingPeriodStart?: string;
  BillingPeriodEnd?: string;
  billingPeriodEnd?: string;
  Currency?: unknown;
  currency?: unknown;
  TotalAmount?: number;
  totalAmount?: number;
  Status?: string;
  status?: string;
  IssuedDate?: string | null;
  issuedDate?: string | null;
  DueDate?: string | null;
  dueDate?: string | null;
}

function mapInvoiceListItem(raw: unknown): InvoiceListItem | null {
  const r = asObject(raw) as RawInvoiceListItem | null;
  if (!r) return null;
  const id = r.Id ?? r.id;
  const project = mapProjectRef(r.Project ?? r.project);
  if (!id || !project) return null;

  return {
    id,
    invoiceNumber: asString(r.InvoiceNumber ?? r.invoiceNumber),
    project,
    clientName: asString(r.ClientName ?? r.clientName),
    billingPeriodStart: asString(r.BillingPeriodStart ?? r.billingPeriodStart),
    billingPeriodEnd: asString(r.BillingPeriodEnd ?? r.billingPeriodEnd),
    currency: mapCurrencyRef(r.Currency ?? r.currency),
    totalAmount: asNumber(r.TotalAmount ?? r.totalAmount),
    status: asStatus(r.Status ?? r.status),
    issuedDate: r.IssuedDate ?? r.issuedDate ?? null,
    dueDate: r.DueDate ?? r.dueDate ?? null,
  };
}

interface RawInvoiceList {
  Items?: unknown;
  items?: unknown;
  TotalCount?: number;
  totalCount?: number;
  Page?: number;
  page?: number;
  PageSize?: number;
  pageSize?: number;
}

/** Maps `Invoice/GetAllInvoices`'s `Data` object (already unwrapped from the envelope). */
export function mapBackendInvoiceList(raw: unknown): InvoiceList {
  const r = (asObject(raw) as RawInvoiceList | null) ?? {};
  return {
    items: asArray(r.Items ?? r.items)
      .map(mapInvoiceListItem)
      .filter((item): item is InvoiceListItem => item !== null),
    totalCount: asNumber(r.TotalCount ?? r.totalCount),
    page: asNumber(r.Page ?? r.page, 1),
    pageSize: asNumber(r.PageSize ?? r.pageSize, 0),
  };
}

/* ------------------------------------------------------------------------ */
/* Detail — `Invoice/GetInvoiceById`                                         */
/* ------------------------------------------------------------------------ */

interface RawInvoiceLineItem {
  Id?: string;
  id?: string;
  User?: unknown;
  user?: unknown;
  ResourceRoleType?: unknown;
  resourceRoleType?: unknown;
  TimesheetEntryId?: string;
  timesheetEntryId?: string;
  Description?: string;
  description?: string;
  Hours?: number;
  hours?: number;
  UnitRate?: number;
  unitRate?: number;
  Amount?: number;
  amount?: number;
}

function mapLineItem(raw: unknown): InvoiceLineItem | null {
  const r = asObject(raw) as RawInvoiceLineItem | null;
  if (!r) return null;
  const id = r.Id ?? r.id;
  const user = mapLineItemUserRef(r.User ?? r.user);
  const resourceRoleType = mapLineItemRoleRef(r.ResourceRoleType ?? r.resourceRoleType);
  if (!id || !user || !resourceRoleType) return null;

  return {
    id,
    user,
    resourceRoleType,
    timesheetEntryId: asString(r.TimesheetEntryId ?? r.timesheetEntryId),
    description: asString(r.Description ?? r.description),
    hours: asNumber(r.Hours ?? r.hours),
    unitRate: asNumber(r.UnitRate ?? r.unitRate),
    amount: asNumber(r.Amount ?? r.amount),
  };
}

interface RawInvoiceDetail {
  Id?: string;
  id?: string;
  InvoiceNumber?: string;
  invoiceNumber?: string;
  Project?: unknown;
  project?: unknown;
  ClientName?: string;
  clientName?: string;
  ClientEmail?: string | null;
  clientEmail?: string | null;
  BillingPeriodStart?: string;
  billingPeriodStart?: string;
  BillingPeriodEnd?: string;
  billingPeriodEnd?: string;
  Currency?: unknown;
  currency?: unknown;
  ExchangeRate?: number;
  exchangeRate?: number;
  SubTotal?: number;
  subTotal?: number;
  TaxAmount?: number;
  taxAmount?: number;
  TotalAmount?: number;
  totalAmount?: number;
  Status?: string;
  status?: string;
  IssuedDate?: string | null;
  issuedDate?: string | null;
  DueDate?: string | null;
  dueDate?: string | null;
  Notes?: string | null;
  notes?: string | null;
  LineItems?: unknown;
  lineItems?: unknown;
  CreatedAt?: string;
  createdAt?: string;
}

/** Maps `Invoice/GetInvoiceById`'s `Data` object (already unwrapped from the envelope). Returns `null` if the minimum required fields are missing. */
export function mapBackendInvoiceDetail(raw: unknown): InvoiceDetail | null {
  const r = asObject(raw) as RawInvoiceDetail | null;
  if (!r) return null;
  const id = r.Id ?? r.id;
  const project = mapProjectRef(r.Project ?? r.project);
  if (!id || !project) return null;

  return {
    id,
    invoiceNumber: asString(r.InvoiceNumber ?? r.invoiceNumber),
    project,
    clientName: asString(r.ClientName ?? r.clientName),
    clientEmail: r.ClientEmail ?? r.clientEmail ?? null,
    billingPeriodStart: asString(r.BillingPeriodStart ?? r.billingPeriodStart),
    billingPeriodEnd: asString(r.BillingPeriodEnd ?? r.billingPeriodEnd),
    currency: mapCurrencyRef(r.Currency ?? r.currency),
    exchangeRate: asNumber(r.ExchangeRate ?? r.exchangeRate, 1),
    subTotal: asNumber(r.SubTotal ?? r.subTotal),
    taxAmount: asNumber(r.TaxAmount ?? r.taxAmount),
    totalAmount: asNumber(r.TotalAmount ?? r.totalAmount),
    status: asStatus(r.Status ?? r.status),
    issuedDate: r.IssuedDate ?? r.issuedDate ?? null,
    dueDate: r.DueDate ?? r.dueDate ?? null,
    notes: r.Notes ?? r.notes ?? null,
    lineItems: asArray(r.LineItems ?? r.lineItems)
      .map(mapLineItem)
      .filter((item): item is InvoiceLineItem => item !== null),
    createdAt: asOptionalString(r.CreatedAt ?? r.createdAt),
  };
}

/* ------------------------------------------------------------------------ */
/* Generate — `Invoice/GenerateInvoice`                                      */
/* ------------------------------------------------------------------------ */

interface RawGenerateInvoiceResult {
  Id?: string;
  id?: string;
  InvoiceNumber?: string;
  invoiceNumber?: string;
  ProjectId?: string;
  projectId?: string;
  ProjectName?: string;
  projectName?: string;
  ClientName?: string;
  clientName?: string;
  BillingPeriodStart?: string;
  billingPeriodStart?: string;
  BillingPeriodEnd?: string;
  billingPeriodEnd?: string;
  Currency?: unknown;
  currency?: unknown;
  ExchangeRate?: number;
  exchangeRate?: number;
  SubTotal?: number;
  subTotal?: number;
  TaxAmount?: number;
  taxAmount?: number;
  TotalAmount?: number;
  totalAmount?: number;
  Status?: string;
  status?: string;
  LineItemCount?: number;
  lineItemCount?: number;
}

/** Maps `Invoice/GenerateInvoice`'s `Data` object (already unwrapped from the envelope). Returns `null` if the minimum required fields are missing. */
export function mapBackendGenerateInvoiceResult(raw: unknown): GenerateInvoiceResult | null {
  const r = asObject(raw) as RawGenerateInvoiceResult | null;
  if (!r) return null;
  const id = r.Id ?? r.id;
  if (!id) return null;

  return {
    id,
    invoiceNumber: asString(r.InvoiceNumber ?? r.invoiceNumber),
    projectId: asString(r.ProjectId ?? r.projectId),
    projectName: asString(r.ProjectName ?? r.projectName),
    clientName: asString(r.ClientName ?? r.clientName),
    billingPeriodStart: asString(r.BillingPeriodStart ?? r.billingPeriodStart),
    billingPeriodEnd: asString(r.BillingPeriodEnd ?? r.billingPeriodEnd),
    currency: mapCurrencyRef(r.Currency ?? r.currency),
    exchangeRate: asNumber(r.ExchangeRate ?? r.exchangeRate, 1),
    subTotal: asNumber(r.SubTotal ?? r.subTotal),
    taxAmount: asNumber(r.TaxAmount ?? r.taxAmount),
    totalAmount: asNumber(r.TotalAmount ?? r.totalAmount),
    status: asStatus(r.Status ?? r.status),
    lineItemCount: asNumber(r.LineItemCount ?? r.lineItemCount),
  };
}

/* ------------------------------------------------------------------------ */
/* Update — `Invoice/UpdateInvoice`                                          */
/* ------------------------------------------------------------------------ */

interface RawUpdateInvoiceResult {
  Id?: string;
  id?: string;
  InvoiceNumber?: string;
  invoiceNumber?: string;
  ClientName?: string;
  clientName?: string;
  ClientEmail?: string | null;
  clientEmail?: string | null;
  IssuedDate?: string | null;
  issuedDate?: string | null;
  DueDate?: string | null;
  dueDate?: string | null;
  Notes?: string | null;
  notes?: string | null;
  Status?: string;
  status?: string;
}

/** Maps `Invoice/UpdateInvoice`'s `Data` object (already unwrapped from the envelope). Returns `null` if the minimum required fields are missing. */
export function mapBackendUpdateInvoiceResult(raw: unknown): UpdateInvoiceResult | null {
  const r = asObject(raw) as RawUpdateInvoiceResult | null;
  if (!r) return null;
  const id = r.Id ?? r.id;
  if (!id) return null;

  return {
    id,
    invoiceNumber: asString(r.InvoiceNumber ?? r.invoiceNumber),
    clientName: asString(r.ClientName ?? r.clientName),
    clientEmail: r.ClientEmail ?? r.clientEmail ?? null,
    issuedDate: r.IssuedDate ?? r.issuedDate ?? null,
    dueDate: r.DueDate ?? r.dueDate ?? null,
    notes: r.Notes ?? r.notes ?? null,
    status: asStatus(r.Status ?? r.status),
  };
}

/* ------------------------------------------------------------------------ */
/* Status transitions — Send/MarkPaid/Void/Cancel                            */
/* ------------------------------------------------------------------------ */

interface RawInvoiceStatusChangeResult {
  Id?: string;
  id?: string;
  Status?: string;
  status?: string;
}

/** Maps the shared `{ Id, Status }` response returned by `SendInvoice`/`MarkInvoicePaid`/`VoidInvoice`/`CancelInvoice`. Returns `null` if the minimum required fields are missing. */
export function mapBackendInvoiceStatusChangeResult(raw: unknown): InvoiceStatusChangeResult | null {
  const r = asObject(raw) as RawInvoiceStatusChangeResult | null;
  if (!r) return null;
  const id = r.Id ?? r.id;
  if (!id) return null;

  return { id, status: asStatus(r.Status ?? r.status) };
}
