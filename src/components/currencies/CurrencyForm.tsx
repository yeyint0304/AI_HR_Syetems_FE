"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { SelectField } from "@/components/ui/SelectField";
import { Alert } from "@/components/ui/Alert";
import {
  createCurrencySchema,
  type CreateCurrencyFormValues,
} from "@/lib/validators/currency.validators";
import { useCreateCurrency, useUpdateCurrency } from "@/hooks/useCurrencies";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";
import type { Currency } from "@/types/currency.types";

export interface CurrencyFormProps {
  mode: "create" | "edit";
  /** Required when `mode === "edit"`. */
  currency?: Currency;
  onSuccess: () => void;
  onCancel: () => void;
}

type FormValues = CreateCurrencyFormValues;

/**
 * Shared create/edit form for the Currency feature, rendered inside a
 * `Modal` by `CurrenciesListView` per the wireframe's "+ Add Currency ->
 * modal; Edit -> pre-filled modal" pattern
 * (`docs/HR_System_FE_wireframe.pdf`). `Code` and "base currency" can only be
 * chosen at creation time — `Currency/UpdateCurrency` only accepts
 * Name/Symbol/IsActive (see `lib/validators/currency.validators.ts`), so in
 * edit mode both are shown read-only, mirroring
 * `components/exchangeRates/ExchangeRateForm.tsx`'s immutable-field pattern.
 */
export function CurrencyForm({ mode, currency, onSuccess, onCancel }: CurrencyFormProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateCurrency();
  const updateMutation = useUpdateCurrency(currency?.id ?? "");

  const defaultValues: FormValues =
    mode === "edit" && currency
      ? {
          code: currency.code,
          name: currency.name,
          symbol: currency.symbol,
          isBaseCurrency: currency.isBaseCurrency,
          isActive: currency.isActive,
        }
      : {
          code: "",
          name: "",
          symbol: "",
          isBaseCurrency: false,
          isActive: true,
        };

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createCurrencySchema),
    defaultValues,
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    if (mode === "create") {
      createMutation.mutate(
        {
          code: values.code,
          name: values.name,
          symbol: values.symbol,
          isBaseCurrency: values.isBaseCurrency,
          isActive: true,
        },
        {
          onSuccess,
          onError: (error) => {
            setFormError(getApiErrorMessage(error, "Unable to create the currency. Please try again."));
          },
        }
      );
      return;
    }

    updateMutation.mutate(
      { name: values.name, symbol: values.symbol, isActive: values.isActive },
      {
        onSuccess,
        onError: (error) => {
          setFormError(getApiErrorMessage(error, "Unable to update the currency. Please try again."));
        },
      }
    );
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      {formError && <Alert variant="error">{formError}</Alert>}

      <div className="grid gap-5 sm:grid-cols-2">
        {mode === "create" ? (
          <TextField
            label="Code"
            placeholder="e.g. USD"
            maxLength={3}
            className="uppercase"
            hint="3-letter ISO 4217 code."
            error={errors.code?.message}
            {...register("code", {
              setValueAs: (value) => (typeof value === "string" ? value.toUpperCase() : value),
            })}
          />
        ) : (
          <TextField label="Code" value={currency?.code ?? ""} disabled readOnly />
        )}

        <TextField
          label="Symbol"
          placeholder="e.g. $"
          maxLength={10}
          error={errors.symbol?.message}
          {...register("symbol")}
        />
      </div>

      <TextField
        label="Name"
        placeholder="e.g. US Dollar"
        error={errors.name?.message}
        {...register("name")}
      />

      {mode === "create" ? (
        <Controller
          control={control}
          name="isBaseCurrency"
          render={({ field }) => (
            <SelectField
              label="Base currency?"
              name={field.name}
              ref={field.ref}
              value={field.value ? "true" : "false"}
              onBlur={field.onBlur}
              onChange={(event) => field.onChange(event.target.value === "true")}
              hint="Only one currency can be the base at a time; setting this will replace the existing base currency."
              options={[
                { value: "false", label: "No" },
                { value: "true", label: "Yes — set as base currency" },
              ]}
            />
          )}
        />
      ) : (
        <TextField
          label="Base currency?"
          value={currency?.isBaseCurrency ? "Yes" : "No"}
          disabled
          readOnly
          hint="The base currency cannot be changed after creation."
        />
      )}

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
          hint="New currencies start as Active."
          options={[{ value: "true", label: "Active" }]}
          onChange={() => {}}
        />
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {mode === "create" ? "Add currency" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
