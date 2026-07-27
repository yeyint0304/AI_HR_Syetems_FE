"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Alert } from "@/components/ui/Alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createCountrySchema,
  type CreateCountryFormValues,
} from "@/lib/validators/country.validators";
import { useCreateCountry, useUpdateCountry } from "@/hooks/useCountries";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";
import type { Country } from "@/types/country.types";

export interface CountryFormProps {
  mode: "create" | "edit";
  /** Required when `mode === "edit"`. */
  country?: Country;
  onSuccess: () => void;
  onCancel: () => void;
}

type FormValues = CreateCountryFormValues;

/**
 * Shared create/edit form for the Country feature, rendered inside a `Modal`
 * by `CountriesListView` per the wireframe's "Add -> modal; Edit -> pre-filled
 * modal" pattern (`docs/HR_System_FE_wireframe.pdf`). `Code` can only be
 * chosen at creation time — `Country/UpdateCountry` only accepts `Name` (see
 * `lib/validators/country.validators.ts`), so in edit mode the code is shown
 * read-only, mirroring `components/exchangeRates/ExchangeRateForm.tsx`'s
 * immutable-field pattern.
 */
export function CountryForm({ mode, country, onSuccess, onCancel }: CountryFormProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateCountry();
  const updateMutation = useUpdateCountry(country?.id ?? "");

  const defaultValues: FormValues =
    mode === "edit" && country
      ? { code: country.code, name: country.name }
      : { code: "", name: "" };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createCountrySchema),
    defaultValues,
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    if (mode === "create") {
      createMutation.mutate(
        { code: values.code, name: values.name },
        {
          onSuccess,
          onError: (error) => {
            setFormError(getApiErrorMessage(error, "Unable to create the country. Please try again."));
          },
        }
      );
      return;
    }

    updateMutation.mutate(
      { name: values.name },
      {
        onSuccess,
        onError: (error) => {
          setFormError(getApiErrorMessage(error, "Unable to update the country. Please try again."));
        },
      }
    );
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      {formError && <Alert variant="error">{formError}</Alert>}

      {mode === "create" ? (
        <TextField
          label="Code"
          placeholder="e.g. SG"
          maxLength={2}
          className="uppercase"
          hint="2-letter ISO 3166-1 code."
          error={errors.code?.message}
          {...register("code", {
            setValueAs: (value) => (typeof value === "string" ? value.toUpperCase() : value),
          })}
        />
      ) : (
        <TextField label="Code" value={country?.code ?? ""} disabled readOnly />
      )}

      <TextField
        label="Name"
        placeholder="e.g. Singapore"
        error={errors.name?.message}
        {...register("name")}
      />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {mode === "create" ? "Add country" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
