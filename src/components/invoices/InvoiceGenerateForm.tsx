"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { SelectField } from "@/components/ui/SelectField";
import { Alert } from "@/components/ui/Alert";
import { useProjectList } from "@/hooks/useProjects";
import { useCurrencyList } from "@/hooks/useCurrencies";
import { useGenerateInvoice } from "@/hooks/useInvoices";
import { generateInvoiceSchema, type GenerateInvoiceFormValues } from "@/lib/validators/invoice.validators";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";

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
 */
export function InvoiceGenerateForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const { data: projects, isLoading: isProjectsLoading } = useProjectList();
  const { data: currencies, isLoading: isCurrenciesLoading } = useCurrencyList();
  const generateInvoiceMutation = useGenerateInvoice();

  const sortedProjects = useMemo(
    () => [...(projects ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [projects]
  );
  const sortedCurrencies = useMemo(
    () => [...(currencies ?? [])].sort((a, b) => a.code.localeCompare(b.code)),
    [currencies]
  );
  const baseCurrency = useMemo(
    () => sortedCurrencies.find((currency) => currency.isBaseCurrency),
    [sortedCurrencies]
  );

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<GenerateInvoiceFormValues>({
    resolver: zodResolver(generateInvoiceSchema),
    defaultValues: DEFAULT_VALUES,
  });

  // Pre-select the base currency once reference data has loaded, per the
  // wireframe mock (`Invoice Currency` defaults to "SGD — Singapore Dollar
  // (Base)"), without clobbering a value the user has already chosen.
  useEffect(() => {
    if (baseCurrency && !getValues("currencyId")) {
      setValue("currencyId", baseCurrency.id);
    }
  }, [baseCurrency, getValues, setValue]);

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
