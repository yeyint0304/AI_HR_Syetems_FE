"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Alert } from "@/components/ui/Alert";
import {
  updateProfileSchema,
  type UpdateProfileFormValues,
} from "@/lib/validators/auth.validators";
import { useUpdateProfile } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";
import type { AuthUser } from "@/types/auth.types";

interface UpdateProfileFormProps {
  initialValues: Pick<AuthUser, "firstName" | "lastName" | "email" | "countryId">;
}

export function UpdateProfileForm({ initialValues }: UpdateProfileFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const updateProfileMutation = useUpdateProfile();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: initialValues.firstName ?? "",
      lastName: initialValues.lastName ?? "",
      email: initialValues.email,
      countryId: initialValues.countryId ?? "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    setSuccessMessage(null);
    updateProfileMutation.mutate(
      { ...values, countryId: values.countryId || null },
      {
        onSuccess: () => {
          setSuccessMessage(
            "Your profile has been updated. Name changes will be reflected the next time you sign in."
          );
        },
        onError: (error) => {
          setFormError(
            getApiErrorMessage(error, "Unable to update your profile. Please try again.")
          );
        },
      }
    );
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      {formError && <Alert variant="error">{formError}</Alert>}
      {successMessage && <Alert variant="success">{successMessage}</Alert>}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="First name" error={errors.firstName?.message} {...register("firstName")} />
        <TextField label="Last name" error={errors.lastName?.message} {...register("lastName")} />
      </div>

      <TextField
        label="Email address"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />

      <TextField
        label="Country ID"
        hint="Optional. Leave blank if not applicable."
        error={errors.countryId?.message}
        {...register("countryId")}
      />

      <div>
        <Button type="submit" isLoading={updateProfileMutation.isPending} disabled={!isDirty}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
