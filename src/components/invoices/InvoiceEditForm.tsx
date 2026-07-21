"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { SelectField } from "@/components/ui/SelectField";
import { Alert } from "@/components/ui/Alert";
import { useCurrencyList } from "@/hooks/useCurrencies";
import { useUpdateInvoice } from "@/hooks/useInvoices";
import { updateInvoiceSchema, type UpdateInvoiceFormValues } from "@/lib/validators/invoice.validators";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";
import { toDateInputValue } from "@/lib/utils/date";
import type { InvoiceDetail } from "@/types/invoice.types";

interface InvoiceEditFormProps {
  invoice: InvoiceDetail;
  onCancel: () => void;
  onSaved: () => void;
}

/**
 * Inline "Edit Invoice" form shown on `/invoices/[id]` for Draft invoices
 * only (`Invoice/UpdateInvoice` rejects updates to non-Draft invoices).
 * Mirrors the edit-mode pattern established by `ProjectForm`
 * (`components/projects/ProjectForm.tsx`).
 */
export function InvoiceEditForm({ invoice, onCancel, onSaved }: InvoiceEditFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const { data: currencies, isLoading: isCurrenciesLoading } = useCurrencyList();
  const updateInvoiceMutation = useUpdateInvoice(invoice.id);

  const sortedCurrencies = useMemo(
    () => [...(currencies ?? [])].sort((a, b) => a.code.localeCompare(b.code)),
    [currencies]
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateInvoiceFormValues>({
    resolver: zodResolver(updateInvoiceSchema),
    defaultValues: {
      currencyId: invoice.currency.id ?? "",
      clientName: invoice.clientName,
      clientEmail: invoice.clientEmail ?? "",
      issuedDate: toDateInputValue(invoice.issuedDate),
      dueDate: toDateInputValue(invoice.dueDate),
      notes: invoice.notes ?? "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    updateInvoiceMutation.mutate(
      {
        currencyId: values.currencyId || undefined,
        clientName: values.clientName || undefined,
        clientEmail: values.clientEmail || undefined,
        issuedDate: values.issuedDate || undefined,
        dueDate: values.dueDate || undefined,
        notes: values.notes || undefined,
      },
      {
        onSuccess: () => onSaved(),
        onError: (error) => {
          setFormError(getApiErrorMessage(error, "Unable to update the invoice. Please try again."));
        },
      }
    );
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {formError && <Alert variant="error">{formError}</Alert>}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Client name" error={errors.clientName?.message} {...register("clientName")} />
        <TextField
          label="Client email"
          type="email"
          error={errors.clientEmail?.message}
          {...register("clientEmail")}
        />
      </div>

      <SelectField
        label="Invoice currency"
        placeholder={isCurrenciesLoading ? "Loading currencies…" : "Select a currency…"}
        disabled={isCurrenciesLoading}
        error={errors.currencyId?.message}
        options={sortedCurrencies.map((currency) => ({
          value: currency.id,
          label: `${currency.code} — ${currency.name}`,
        }))}
        {...register("currencyId")}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Issued date" type="date" error={errors.issuedDate?.message} {...register("issuedDate")} />
        <TextField label="Due date" type="date" error={errors.dueDate?.message} {...register("dueDate")} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="invoice-edit-notes" className="text-sm font-medium text-slate-700">
          Notes
        </label>
        <textarea
          id="invoice-edit-notes"
          rows={3}
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
        <Button type="button" variant="secondary" onClick={onCancel} disabled={updateInvoiceMutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" isLoading={updateInvoiceMutation.isPending}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
