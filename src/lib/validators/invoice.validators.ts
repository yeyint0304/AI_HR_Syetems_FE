import { z } from "zod";
import { INVOICE_STATUSES } from "@/lib/constants/invoice.constants";
import { guidSchema } from "@/lib/validators/shared.validators";

/**
 * Shared Zod schemas for the Invoice feature. Used both client-side (via
 * `zodResolver` in React Hook Form / manual `safeParse` on filter bars) and
 * server-side (Route Handlers re-validate the payload/query string — never
 * trust client-side validation alone), per the same convention as
 * `lib/validators/project.validators.ts` / `lib/validators/report.validators.ts`.
 */

/** Matches the backend's documented `YYYY-MM-DD` date-only format for Invoice requests. */
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const dateOnlyField = (label: string) =>
  z
    .string()
    .min(1, `${label} is required.`)
    .regex(DATE_ONLY_PATTERN, `${label} must use the YYYY-MM-DD date format.`);

const optionalDateOnlyField = (label: string) =>
  z
    .string()
    .regex(DATE_ONLY_PATTERN, `${label} must use the YYYY-MM-DD date format.`)
    .optional()
    .or(z.literal(""));

/* ------------------------------------------------------------------------ */
/* Generate Invoice — `Invoice/GenerateInvoice`                              */
/* ------------------------------------------------------------------------ */

/**
 * Matches `Invoice/GenerateInvoice`. The wireframe's `/invoices/generate` mock
 * only shows Project/Billing Period/Invoice Currency/Tax Rate fields, but the
 * real backend contract requires `ClientName` and additionally accepts
 * `ClientEmail`/`IssuedDate`/`DueDate`/`Notes` — the same divergence already
 * documented on `ProjectForm` (`lib/validators/project.validators.ts`) for
 * fields the wireframe omits. `TaxRate` has no counterpart on the real
 * request body (tax is computed server-side), so it is intentionally not
 * modeled here.
 */
export const generateInvoiceSchema = z
  .object({
    projectId: z.string().min(1, "Select a project."),
    billingPeriodStart: dateOnlyField("Billing period start"),
    billingPeriodEnd: dateOnlyField("Billing period end"),
    currencyId: z.string().min(1, "Select an invoice currency."),
    clientName: z.string().trim().min(1, "Client name is required.").max(150, "Client name is too long."),
    clientEmail: z.email("Enter a valid client email address.").optional().or(z.literal("")),
    issuedDate: optionalDateOnlyField("Issued date"),
    dueDate: optionalDateOnlyField("Due date"),
    notes: z.string().trim().max(1000, "Notes are too long.").optional().or(z.literal("")),
  })
  .refine((data) => data.billingPeriodEnd >= data.billingPeriodStart, {
    message: "Billing period end must be on or after the billing period start.",
    path: ["billingPeriodEnd"],
  })
  .refine((data) => !data.issuedDate || !data.dueDate || data.dueDate >= data.issuedDate, {
    message: "Due date must be on or after the issued date.",
    path: ["dueDate"],
  });
export type GenerateInvoiceFormValues = z.infer<typeof generateInvoiceSchema>;

/* ------------------------------------------------------------------------ */
/* Update Invoice — `Invoice/UpdateInvoice`                                  */
/* ------------------------------------------------------------------------ */

/** Matches `Invoice/UpdateInvoice` — all fields are optional; only `Draft` invoices may be updated. */
export const updateInvoiceSchema = z
  .object({
    currencyId: z.string().min(1, "Select an invoice currency.").optional().or(z.literal("")),
    clientName: z.string().trim().max(150, "Client name is too long.").optional().or(z.literal("")),
    clientEmail: z.email("Enter a valid client email address.").optional().or(z.literal("")),
    issuedDate: optionalDateOnlyField("Issued date"),
    dueDate: optionalDateOnlyField("Due date"),
    notes: z.string().trim().max(1000, "Notes are too long.").optional().or(z.literal("")),
  })
  .refine((data) => !data.issuedDate || !data.dueDate || data.dueDate >= data.issuedDate, {
    message: "Due date must be on or after the issued date.",
    path: ["dueDate"],
  });
export type UpdateInvoiceFormValues = z.infer<typeof updateInvoiceSchema>;

/* ------------------------------------------------------------------------ */
/* List filters — `Invoice/GetAllInvoices`                                    */
/* ------------------------------------------------------------------------ */

/**
 * Server-side query schema for `GET /api/invoices`, matching the params
 * documented on `Invoice/GetAllInvoices` (all optional).
 *
 * Uses the lenient `guidSchema` (not `z.uuid()`) for `projectId`/`currencyId`
 * — see `lib/validators/shared.validators.ts`. The backend's seeded Currency
 * ids (`docs/HR_System_BE.postman_collection.json`, e.g.
 * `33333333-3333-3333-3333-333333333301`) don't satisfy `z.uuid()`'s RFC
 * 9562/4122 variant-nibble check, which was turning a valid "Project"/
 * currency filter into a 400 ("Invalid filter parameters.") — the same class
 * of bug already fixed for `createUserSchema.roleId` and
 * `timesheetEntryListQuerySchema`.
 */
export const invoiceListQuerySchema = z.object({
  projectId: guidSchema("projectId must be a valid GUID.").optional(),
  status: z.enum(INVOICE_STATUSES as [string, ...string[]]).optional(),
  startDate: z.string().regex(DATE_ONLY_PATTERN, "startDate must use the YYYY-MM-DD format.").optional(),
  endDate: z.string().regex(DATE_ONLY_PATTERN, "endDate must use the YYYY-MM-DD format.").optional(),
  currencyId: guidSchema("currencyId must be a valid GUID.").optional(),
  page: z.coerce.number("page must be a number.").int().min(1).optional(),
  pageSize: z.coerce.number("pageSize must be a number.").int().min(1).max(200).optional(),
});
export type InvoiceListQuery = z.infer<typeof invoiceListQuerySchema>;

/** Client-side filter-bar schema for `/invoices`, mirroring `invoiceListQuerySchema`'s constraints on plain strings (empty = "not set"). */
export const invoiceListFilterSchema = z.object({
  projectId: z.string().optional(),
  status: z.enum(["", ...INVOICE_STATUSES]).optional(),
  startDate: z.string().regex(DATE_ONLY_PATTERN, "Date From must use the YYYY-MM-DD format.").optional().or(z.literal("")),
  endDate: z.string().regex(DATE_ONLY_PATTERN, "Date To must use the YYYY-MM-DD format.").optional().or(z.literal("")),
});
export type InvoiceListFilterValues = z.infer<typeof invoiceListFilterSchema>;
