"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { SelectField } from "@/components/ui/SelectField";
import { Alert } from "@/components/ui/Alert";
import { useProjectSelectOptions } from "@/hooks/useProjects";
import { useCurrencyList } from "@/hooks/useCurrencies";
import { useGenerateInvoice } from "@/hooks/useInvoices";
import { useTimesheetEntryList } from "@/hooks/useTimesheetEntries";
import { generateInvoiceSchema, type GenerateInvoiceFormValues } from "@/lib/validators/invoice.validators";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";
import { isDateOnlyInRange } from "@/lib/utils/week";
import { filterSelectableCurrencies } from "@/lib/utils/currency";

const DEFAULT_VALUES: GenerateInvoiceFormValues = {
  projectId: "",
  billingPeriodStart: "",
  billingPeriodEnd: "",
  currencyId: "",
  clientName: "",
  clientEmail: "",
  issuedDate: "",
  dueDate: "",
  notes: "",
};

/** Matches the backend's documented `YYYY-MM-DD` date-only format. */
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function readDateOnlyParam(value: string | null): string {
  return value && DATE_ONLY_PATTERN.test(value) ? value : "";
}

/**
 * `/invoices/generate` — "Generate Invoice" form, per the wireframe
 * (`docs/HR_System_FE_wireframe.pdf`: "form renders; ... 'Generate Invoice'
 * navigates to /invoices/1"). Backed by `Invoice/GenerateInvoice`
 * (`docs/HR_System_BE.postman_collection.json`), via `POST /api/invoices`.
 *
 * Two deliberate deviations from the wireframe mock, both documented at their
 * schema in `lib/validators/invoice.validators.ts#generateInvoiceSchema`:
 * - `Client Name`/`Client Email`/`Issued Date`/`Due Date`/`Notes` are shown
 *   here even though the wireframe screen only mocks Project/Billing
 *   Period/Currency, because the real `Invoice/GenerateInvoice` request
 *   requires `ClientName` (and optionally accepts the others) — the same
 *   divergence already established by `ProjectForm` for fields the wireframe
 *   omits.
 * - The wireframe's "Tax Rate (%)" field and two-step "Preview Line Items"
 *   flow have no counterpart in the real API contract (tax is computed
 *   server-side, and there is no dedicated preview endpoint — `GenerateInvoice`
 *   directly creates the Draft invoice from approved timesheet entries), so
 *   this is a single-step form that submits straight to `Invoice/GenerateInvoice`.
 *
 * Per the `bugs/timesheet-history` feature request ("fix the create invoice
 * that showing 400 ... No approved timesheet entries found in the specified
 * billing period"): that message is a real, correctly-surfaced backend
 * business rule (`Invoice/GenerateInvoice` only invoices *approved* entries
 * inside `BillingPeriodStart`/`BillingPeriodEnd`) — not a client-side bug —
 * but this screen previously gave the user no way to know *in advance*
 * whether their chosen Project/Billing Period combination actually had any
 * approved entries, so the 400 landed as a surprise after a manual date
 * guess. Two changes address that:
 * - **Prefill from context**: `TimesheetHistoryView`'s "Generate Invoice"
 *   link now forwards its currently-applied Project/Date From/Date To filters
 *   as `?projectId=&billingPeriodStart=&billingPeriodEnd=` query params (see
 *   that component), so a manager who just reviewed/approved entries for a
 *   specific project and range lands here with the exact same values already
 *   selected, instead of guessing blind.
 * - **Proactive approved-entries check**: once a project and a valid
 *   Start ≤ End billing period are selected, `useTimesheetEntryList` fetches
 *   that project's approved entries and this component warns *before*
 *   submission if none of them fall inside the chosen range — see
 *   `hasApprovedEntriesInRange` below. This is a non-blocking, best-effort
 *   heads-up only (another manager could approve an entry in the same
 *   instant, and the backend remains the actual authority), so submission is
 *   still allowed either way; the real 400 message still renders via
 *   `formError` in the rare case the check and the submit race.
 */
export function InvoiceGenerateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);

  // Scoped to "my projects" for ProjectAdmin, full catalog for SystemAdmin —
  // see `hooks/useProjects.ts#useProjectSelectOptions` — so a ProjectAdmin
  // can only generate invoices against a project they actually manage.
  const { data: projects, isLoading: isProjectsLoading } = useProjectSelectOptions();
  const { data: currencies, isLoading: isCurrenciesLoading } = useCurrencyList();
  const generateInvoiceMutation = useGenerateInvoice();

  const sortedProjects = useMemo(
    () => [...(projects ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [projects]
  );
  const sortedCurrencies = useMemo(
    () =>
      filterSelectableCurrencies([...(currencies ?? [])]).sort((a, b) =>
        a.code.localeCompare(b.code)
      ),
    [currencies]
  );
  const baseCurrency = useMemo(
    () => sortedCurrencies.find((currency) => currency.isBaseCurrency),
    [sortedCurrencies]
  );

  // Carried over from `TimesheetHistoryView`'s "Generate Invoice" link, if the
  // manager arrived here from a filtered review — see the component doc
  // comment. Read once at mount: `useForm`'s `defaultValues` are only applied
  // on the initial render, which is fine here since this query string doesn't
  // change for the lifetime of this mounted form.
  const prefillProjectId = searchParams.get("projectId") ?? "";
  const prefillBillingPeriodStart = readDateOnlyParam(searchParams.get("billingPeriodStart"));
  const prefillBillingPeriodEnd = readDateOnlyParam(searchParams.get("billingPeriodEnd"));

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    control,
    formState: { errors },
  } = useForm<GenerateInvoiceFormValues>({
    resolver: zodResolver(generateInvoiceSchema),
    defaultValues: {
      ...DEFAULT_VALUES,
      billingPeriodStart: prefillBillingPeriodStart,
      billingPeriodEnd: prefillBillingPeriodEnd,
    },
  });

  // Pre-select the base currency once reference data has loaded, per the
  // wireframe mock (`Invoice Currency` defaults to "SGD — Singapore Dollar
  // (Base)"), without clobbering a value the user has already chosen.
  useEffect(() => {
    if (baseCurrency && !getValues("currencyId")) {
      setValue("currencyId", baseCurrency.id);
    }
  }, [baseCurrency, getValues, setValue]);

  // Pre-select the project carried over from Timesheet History, once its id
  // is confirmed to actually exist in the loaded project list (the real
  // safety boundary here — an unrecognized id is simply never applied) —
  // mirrors the `baseCurrency` effect above. Deferred behind `sortedProjects`
  // (rather than applied directly via `defaultValues`) because the
  // `<select>`'s `<option>`s don't exist yet on the very first render, before
  // `useProjectList` resolves.
  useEffect(() => {
    if (
      prefillProjectId &&
      sortedProjects.some((project) => project.id === prefillProjectId) &&
      !getValues("projectId")
    ) {
      setValue("projectId", prefillProjectId);
    }
  }, [prefillProjectId, sortedProjects, getValues, setValue]);

  const watchedProjectId = useWatch({ control, name: "projectId" });
  const watchedBillingPeriodStart = useWatch({ control, name: "billingPeriodStart" });
  const watchedBillingPeriodEnd = useWatch({ control, name: "billingPeriodEnd" });

  const isBillingPeriodValid = Boolean(
    watchedBillingPeriodStart &&
      watchedBillingPeriodEnd &&
      watchedBillingPeriodEnd >= watchedBillingPeriodStart
  );

  // Fetches this project's *approved* entries only (`isApproved: true`) so the
  // billing-period overlap check below can never flag a false positive from
  // still-pending entries the backend would ignore anyway — mirrors exactly
  // what `Invoice/GenerateInvoice` itself considers.
  const {
    data: approvedProjectEntries,
    isLoading: isApprovedEntriesLoading,
    isFetched: isApprovedEntriesFetched,
  } = useTimesheetEntryList(
    { projectId: watchedProjectId, isApproved: true },
    { enabled: Boolean(watchedProjectId) && isBillingPeriodValid }
  );

  const hasApprovedEntriesInRange = useMemo(() => {
    if (!approvedProjectEntries || !isBillingPeriodValid) return true; // Nothing to warn about yet.
    return approvedProjectEntries.some((entry) =>
      isDateOnlyInRange(entry.entryDate, watchedBillingPeriodStart, watchedBillingPeriodEnd)
    );
  }, [approvedProjectEntries, isBillingPeriodValid, watchedBillingPeriodStart, watchedBillingPeriodEnd]);

  const showNoApprovedEntriesWarning =
    Boolean(watchedProjectId) &&
    isBillingPeriodValid &&
    isApprovedEntriesFetched &&
    !isApprovedEntriesLoading &&
    !hasApprovedEntriesInRange;

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    generateInvoiceMutation.mutate(
      {
        projectId: values.projectId,
        billingPeriodStart: values.billingPeriodStart,
        billingPeriodEnd: values.billingPeriodEnd,
        currencyId: values.currencyId,
        clientName: values.clientName,
        clientEmail: values.clientEmail || undefined,
        issuedDate: values.issuedDate || undefined,
        dueDate: values.dueDate || undefined,
        notes: values.notes || undefined,
      },
      {
        onSuccess: (invoice) => {
          router.push(`/invoices/${invoice.id}`);
          router.refresh();
        },
        onError: (error) => {
          setFormError(getApiErrorMessage(error, "Unable to generate the invoice. Please try again."));
        },
      }
    );
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      {formError && <Alert variant="error">{formError}</Alert>}
      {showNoApprovedEntriesWarning && (
        <Alert variant="info">
          No approved timesheet entries were found for this project between {watchedBillingPeriodStart} and{" "}
          {watchedBillingPeriodEnd}. Approve the relevant entries in Timesheet History first, or adjust the
          billing period, before generating the invoice.
        </Alert>
      )}

      <SelectField
        label="Project"
        placeholder={isProjectsLoading ? "Loading projects…" : "Select a project…"}
        disabled={isProjectsLoading}
        error={errors.projectId?.message}
        options={sortedProjects.map((project) => ({ value: project.id, label: project.name }))}
        {...register("projectId")}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Billing period from"
          type="date"
          error={errors.billingPeriodStart?.message}
          {...register("billingPeriodStart")}
        />
        <TextField
          label="Billing period to"
          type="date"
          error={errors.billingPeriodEnd?.message}
          {...register("billingPeriodEnd")}
        />
      </div>

      <SelectField
        label="Invoice currency"
        placeholder={isCurrenciesLoading ? "Loading currencies…" : "Select a currency…"}
        disabled={isCurrenciesLoading}
        error={errors.currencyId?.message}
        options={sortedCurrencies.map((currency) => ({
          value: currency.id,
          label: `${currency.code} — ${currency.name}${currency.isBaseCurrency ? " (Base)" : ""}`,
        }))}
        {...register("currencyId")}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Client name"
          placeholder="e.g. Acme Corp"
          error={errors.clientName?.message}
          {...register("clientName")}
        />
        <TextField
          label="Client email (optional)"
          type="email"
          placeholder="e.g. billing@acme.com"
          error={errors.clientEmail?.message}
          {...register("clientEmail")}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Issued date (optional)"
          type="date"
          error={errors.issuedDate?.message}
          {...register("issuedDate")}
        />
        <TextField
          label="Due date (optional)"
          type="date"
          error={errors.dueDate?.message}
          {...register("dueDate")}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="invoice-notes" className="text-sm font-medium text-slate-700">
          Notes (optional)
        </label>
        <textarea
          id="invoice-notes"
          rows={3}
          placeholder="Optional note printed on the invoice..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          {...register("notes")}
        />
        {errors.notes?.message && (
          <p role="alert" className="text-xs font-medium text-red-600">
            {errors.notes.message}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => router.push("/invoices")}>
          Cancel
        </Button>
        <Button type="submit" isLoading={generateInvoiceMutation.isPending}>
          Generate Invoice
        </Button>
      </div>
    </form>
  );
}
