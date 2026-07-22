"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { SelectField } from "@/components/ui/SelectField";
import { Alert } from "@/components/ui/Alert";
import {
  createExchangeRateSchema,
  type CreateExchangeRateFormValues,
} from "@/lib/validators/exchangeRate.validators";
import { useCreateExchangeRate, useUpdateExchangeRate } from "@/hooks/useExchangeRates";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";
import { toDateInputValue } from "@/lib/utils/date";
import type { Currency } from "@/types/currency.types";
import type { ExchangeRate } from "@/types/exchangeRate.types";

export interface ExchangeRateFormProps {
  mode: "create" | "edit";
  /** The currently configured base currency — always the "From" side (see `/admin/exchange-rates` wireframe: "Define conversion rates from the base currency to other currencies."). */
  baseCurrency: Currency;
  /** Active, non-base currencies selectable as the "To" side in create mode. */
  currencyOptions: Currency[];
  /** Required when `mode === "edit"`. */
  exchangeRate?: ExchangeRate;
  onSuccess: () => void;
  onCancel: () => void;
}

type FormValues = CreateExchangeRateFormValues;

function todayInputValue(): string {
  return toDateInputValue(new Date().toISOString());
}

/**
 * Shared create/edit form for the Exchange Rate feature, rendered inside a
 * `Modal` by `ExchangeRatesListView` per the wireframe's "Add -> modal; Edit
 * -> pre-filled modal" pattern. The currency pair can only be chosen at
 * creation time — `ExchangeRate/UpdateExchangeRate` only accepts
 * Rate/EffectiveDate/IsActive (see `lib/validators/exchangeRate.validators.ts`),
 * so in edit mode both currencies are shown read-only.
 */
export function ExchangeRateForm({
  mode,
  baseCurrency,
  currencyOptions,
  exchangeRate,
  onSuccess,
  onCancel,
}: ExchangeRateFormProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateExchangeRate();
  const updateMutation = useUpdateExchangeRate(exchangeRate?.id ?? "");

  const defaultValues: FormValues =
    mode === "edit" && exchangeRate
      ? {
          fromCurrencyId: exchangeRate.fromCurrency.id,
          toCurrencyId: exchangeRate.toCurrency.id,
          rate: exchangeRate.rate,
          effectiveDate: toDateInputValue(exchangeRate.effectiveDate),
          isActive: exchangeRate.isActive,
        }
      : {
          fromCurrencyId: baseCurrency.id,
          toCurrencyId: currencyOptions[0]?.id ?? "",
          rate: 0,
          effectiveDate: todayInputValue(),
          isActive: true,
        };

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    // A single unified schema/resolver is used for both modes (matching
    // `components/projects/ProjectForm.tsx`'s dual-mode approach) — in edit
    // mode, `fromCurrencyId`/`toCurrencyId` are always present (from
    // `defaultValues`, sourced from the existing `exchangeRate`) and always
    // valid/distinct, so `createExchangeRateSchema`'s extra currency checks
    // are trivially satisfied and never surface to the user; only the
    // rate/effectiveDate/isActive subset is actually sent to the backend in
    // edit mode (see `onSubmit` below — `ExchangeRate/UpdateExchangeRate`
    // doesn't accept currency ids at all).
    resolver: zodResolver(createExchangeRateSchema),
    defaultValues,
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    if (mode === "create") {
      createMutation.mutate(
        {
          fromCurrencyId: baseCurrency.id,
          toCurrencyId: values.toCurrencyId,
          rate: values.rate,
          effectiveDate: values.effectiveDate,
          isActive: true,
        },
        {
          onSuccess,
          onError: (error) => {
            setFormError(
              getApiErrorMessage(error, "Unable to create the exchange rate. Please try again.")
            );
          },
        }
      );
      return;
    }

    updateMutation.mutate(
      { rate: values.rate, effectiveDate: values.effectiveDate, isActive: values.isActive },
      {
        onSuccess,
        onError: (error) => {
          setFormError(
            getApiErrorMessage(error, "Unable to update the exchange rate. Please try again.")
          );
        },
      }
    );
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      {formError && <Alert variant="error">{formError}</Alert>}

      {/* Tracked in form state (for the create-mode "From !== To" schema
          refine) but never user-editable — the base currency is fixed. */}
      <input type="hidden" {...register("fromCurrencyId")} />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="From currency"
          value={`${baseCurrency.code} — ${baseCurrency.name}`}
          disabled
          readOnly
          hint="The base currency (Administration > Currencies)."
        />

        {mode === "create" ? (
          <SelectField
            label="To currency"
            error={errors.toCurrencyId?.message}
            options={currencyOptions.map((currency) => ({
              value: currency.id,
              label: `${currency.code} — ${currency.name}`,
            }))}
            {...register("toCurrencyId")}
          />
        ) : (
          <TextField
            label="To currency"
            value={
              exchangeRate
                ? `${exchangeRate.toCurrency.code}${
                    exchangeRate.toCurrency.symbol ? ` (${exchangeRate.toCurrency.symbol})` : ""
                  }`
                : ""
            }
            disabled
            readOnly
          />
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Rate"
          type="number"
          step="0.000001"
          min={0}
          placeholder="e.g. 0.74"
          hint={`1 ${baseCurrency.code} = ? ${
            mode === "edit" && exchangeRate ? exchangeRate.toCurrency.code : "..."
          }`}
          error={errors.rate?.message}
          {...register("rate", { valueAsNumber: true })}
        />
        <TextField
          label="Effective date"
          type="date"
          error={errors.effectiveDate?.message}
          {...register("effectiveDate")}
        />
      </div>

      {mode === "edit" ? (
        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <SelectField
              label="Status"
              name={field.name}
              ref={field.ref}
              value={field.value ? "true" : "false"}
              onBlur={field.onBlur}
              onChange={(event) => field.onChange(event.target.value === "true")}
              error={errors.isActive?.message}
              options={[
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
            />
          )}
        />
      ) : (
        <SelectField
          label="Status"
          value="true"
          disabled
          hint="New rates start as Active."
          options={[{ value: "true", label: "Active" }]}
          onChange={() => {}}
        />
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {mode === "create" ? "Add rate" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
