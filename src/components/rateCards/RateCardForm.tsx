"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { SelectField } from "@/components/ui/SelectField";
import { CountrySelectField } from "@/components/ui/CountrySelectField";
import { Alert } from "@/components/ui/Alert";
import {
  createRateCardSchema,
  type CreateRateCardFormValues,
} from "@/lib/validators/rateCard.validators";
import { useCreateRateCard, useUpdateRateCard } from "@/hooks/useRateCards";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";
import { toDateInputValue } from "@/lib/utils/date";
import type { Country } from "@/types/country.types";
import type { Currency } from "@/types/currency.types";
import type { ResourceRoleType } from "@/types/project.types";
import type { RateCard } from "@/types/rateCard.types";

export interface RateCardFormProps {
  mode: "create" | "edit";
  countries: Country[];
  resourceRoleTypes: ResourceRoleType[];
  currencies: Currency[];
  isReferenceDataLoading?: boolean;
  /** Required when `mode === "edit"`. */
  rateCard?: RateCard;
  onSuccess: () => void;
  onCancel: () => void;
}

type FormValues = CreateRateCardFormValues;

function todayInputValue(): string {
  return toDateInputValue(new Date().toISOString());
}

/**
 * Shared create/edit form for the Rate Card feature, rendered inside a
 * `Modal` by `RateCardsListView` per the wireframe's "+ Add Rate Card ->
 * modal; Edit -> pre-filled modal" pattern
 * (`docs/HR_System_FE_wireframe.pdf`). Country/Resource role/Currency can
 * only be chosen at creation time — `RateCard/UpdateRateCard` only accepts
 * HourlyRate/BillingRate/EffectiveDate/IsActive (see
 * `lib/validators/rateCard.validators.ts`), so in edit mode all three are
 * shown read-only, mirroring `components/exchangeRates/ExchangeRateForm.tsx`'s
 * immutable-pair pattern.
 *
 * Per the `bugs/exchange-rate` feature request ("country select box need
 * also search"), the Country field uses `CountrySelectField` (a searchable
 * combobox) rather than a plain `<select>`.
 */
export function RateCardForm({
  mode,
  countries,
  resourceRoleTypes,
  currencies,
  isReferenceDataLoading = false,
  rateCard,
  onSuccess,
  onCancel,
}: RateCardFormProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateRateCard();
  const updateMutation = useUpdateRateCard(rateCard?.id ?? "");

  const defaultValues: FormValues =
    mode === "edit" && rateCard
      ? {
          countryId: rateCard.country.id,
          resourceRoleTypeId: rateCard.resourceRoleType.id,
          currencyId: rateCard.currency.id,
          hourlyRate: rateCard.hourlyRate,
          billingRate: rateCard.billingRate,
          effectiveDate: toDateInputValue(rateCard.effectiveDate),
          isActive: rateCard.isActive,
        }
      : {
          countryId: countries[0]?.id ?? "",
          resourceRoleTypeId: resourceRoleTypes[0]?.id ?? "",
          currencyId: currencies[0]?.id ?? "",
          hourlyRate: 0,
          billingRate: 0,
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
    // `ExchangeRateForm`'s dual-mode approach) — in edit mode,
    // `countryId`/`resourceRoleTypeId`/`currencyId` are always present (from
    // `defaultValues`, sourced from the existing `rateCard`) and always
    // valid, so only the rate/effectiveDate/isActive subset is actually sent
    // to the backend in edit mode (see `onSubmit` below —
    // `RateCard/UpdateRateCard` doesn't accept those ids at all).
    resolver: zodResolver(createRateCardSchema),
    defaultValues,
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    if (mode === "create") {
      createMutation.mutate(
        {
          countryId: values.countryId,
          resourceRoleTypeId: values.resourceRoleTypeId,
          currencyId: values.currencyId,
          hourlyRate: values.hourlyRate,
          billingRate: values.billingRate,
          effectiveDate: values.effectiveDate,
          isActive: true,
        },
        {
          onSuccess,
          onError: (error) => {
            setFormError(getApiErrorMessage(error, "Unable to create the rate card. Please try again."));
          },
        }
      );
      return;
    }

    updateMutation.mutate(
      {
        hourlyRate: values.hourlyRate,
        billingRate: values.billingRate,
        effectiveDate: values.effectiveDate,
        isActive: values.isActive,
      },
      {
        onSuccess,
        onError: (error) => {
          setFormError(getApiErrorMessage(error, "Unable to update the rate card. Please try again."));
        },
      }
    );
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      {formError && <Alert variant="error">{formError}</Alert>}

      <div className="grid gap-5 sm:grid-cols-2">
        {mode === "create" ? (
          <Controller
            control={control}
            name="countryId"
            render={({ field }) => (
              <CountrySelectField
                name={field.name}
                countries={countries}
                value={field.value}
                onBlur={field.onBlur}
                onChange={field.onChange}
                isLoading={isReferenceDataLoading}
                disabled={isReferenceDataLoading || countries.length === 0}
                error={errors.countryId?.message}
              />
            )}
          />
        ) : (
          <TextField
            label="Country"
            value={rateCard ? `${rateCard.country.name} (${rateCard.country.code})` : ""}
            disabled
            readOnly
          />
        )}

        {mode === "create" ? (
          <Controller
            control={control}
            name="resourceRoleTypeId"
            render={({ field }) => (
              <SelectField
                label="Resource role"
                name={field.name}
                ref={field.ref}
                value={field.value}
                onBlur={field.onBlur}
                onChange={field.onChange}
                disabled={isReferenceDataLoading || resourceRoleTypes.length === 0}
                placeholder={
                  isReferenceDataLoading
                    ? "Loading resource roles…"
                    : resourceRoleTypes.length === 0
                      ? "No resource roles available"
                      : "Select a resource role..."
                }
                error={errors.resourceRoleTypeId?.message}
                options={resourceRoleTypes.map((role) => ({ value: role.id, label: role.name }))}
              />
            )}
          />
        ) : (
          <TextField label="Resource role" value={rateCard?.resourceRoleType.name ?? ""} disabled readOnly />
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {mode === "create" ? (
          <Controller
            control={control}
            name="currencyId"
            render={({ field }) => (
              <SelectField
                label="Currency"
                name={field.name}
                ref={field.ref}
                value={field.value}
                onBlur={field.onBlur}
                onChange={field.onChange}
                disabled={isReferenceDataLoading || currencies.length === 0}
                placeholder={
                  isReferenceDataLoading
                    ? "Loading currencies…"
                    : currencies.length === 0
                      ? "No currencies available"
                      : "Select a currency..."
                }
                error={errors.currencyId?.message}
                options={currencies.map((currency) => ({
                  value: currency.id,
                  label: `${currency.code} — ${currency.name}`,
                }))}
              />
            )}
          />
        ) : (
          <TextField
            label="Currency"
            value={rateCard ? `${rateCard.currency.code}${rateCard.currency.symbol ? ` (${rateCard.currency.symbol})` : ""}` : ""}
            disabled
            readOnly
          />
        )}

        <TextField
          label="Effective date"
          type="date"
          error={errors.effectiveDate?.message}
          {...register("effectiveDate")}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Hourly rate"
          type="number"
          step="0.01"
          min={0}
          placeholder="e.g. 25.00"
          error={errors.hourlyRate?.message}
          {...register("hourlyRate", { valueAsNumber: true })}
        />
        <TextField
          label="Billing (daily) rate"
          type="number"
          step="0.01"
          min={0}
          placeholder="e.g. 700.00"
          hint="Daily billing rate used for invoice calculations."
          error={errors.billingRate?.message}
          {...register("billingRate", { valueAsNumber: true })}
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
          hint="New rate cards start as Active."
          options={[{ value: "true", label: "Active" }]}
          onChange={() => {}}
        />
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {mode === "create" ? "Add rate card" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
