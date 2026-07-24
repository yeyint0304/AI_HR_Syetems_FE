"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Alert } from "@/components/ui/Alert";
import {
  createResourceRoleTypeSchema,
  type CreateResourceRoleTypeFormValues,
} from "@/lib/validators/resourceRoleType.validators";
import {
  useCreateResourceRoleType,
  useUpdateResourceRoleType,
} from "@/hooks/useResourceRoleTypes";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";
import type { ResourceRoleType } from "@/types/project.types";

export interface ResourceRoleTypeFormProps {
  mode: "create" | "edit";
  /** Required when `mode === "edit"`. */
  resourceRoleType?: ResourceRoleType;
  onSuccess: () => void;
  onCancel: () => void;
}

type FormValues = CreateResourceRoleTypeFormValues;

/**
 * Shared create/edit form for the Resource Role Type feature, rendered
 * inside a `Modal` by `ResourceRoleTypesListView`, following the same
 * "Add -> modal; Edit -> pre-filled modal" pattern as
 * `components/currencies/CurrencyForm.tsx`. Unlike Currency/Country/Rate
 * Card, both `name` and `description` remain editable after creation —
 * `ResourceRoleType/UpdateResourceRoleType` accepts the same shape as create
 * (see `lib/validators/resourceRoleType.validators.ts`).
 */
export function ResourceRoleTypeForm({
  mode,
  resourceRoleType,
  onSuccess,
  onCancel,
}: ResourceRoleTypeFormProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateResourceRoleType();
  const updateMutation = useUpdateResourceRoleType(resourceRoleType?.id ?? "");

  const defaultValues: FormValues =
    mode === "edit" && resourceRoleType
      ? { name: resourceRoleType.name, description: resourceRoleType.description ?? "" }
      : { name: "", description: "" };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createResourceRoleTypeSchema),
    defaultValues,
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    const payload = { name: values.name, description: values.description || null };

    if (mode === "create") {
      createMutation.mutate(payload, {
        onSuccess,
        onError: (error) => {
          setFormError(
            getApiErrorMessage(error, "Unable to create the resource role type. Please try again.")
          );
        },
      });
      return;
    }

    updateMutation.mutate(payload, {
      onSuccess,
      onError: (error) => {
        setFormError(
          getApiErrorMessage(error, "Unable to update the resource role type. Please try again.")
        );
      },
    });
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      {formError && <Alert variant="error">{formError}</Alert>}

      <TextField
        label="Name"
        placeholder="e.g. Senior Developer"
        error={errors.name?.message}
        {...register("name")}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="resource-role-type-description" className="text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          id="resource-role-type-description"
          rows={3}
          placeholder="Optional description of this role..."
          aria-invalid={Boolean(errors.description?.message) || undefined}
          className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
            errors.description ? "border-red-400" : "border-slate-300"
          }`}
          {...register("description")}
        />
        {errors.description?.message && (
          <p role="alert" className="text-xs font-medium text-red-600">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {mode === "create" ? "Add resource role" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
