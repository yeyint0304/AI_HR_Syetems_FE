"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { PasswordField } from "@/components/ui/PasswordField";
import { Alert } from "@/components/ui/Alert";
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from "@/lib/validators/auth.validators";
import { useChangePassword } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";

export function ChangePasswordForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const changePasswordMutation = useChangePassword();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmNewPassword: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    setSuccessMessage(null);
    changePasswordMutation.mutate(values, {
      onSuccess: (result) => {
        setSuccessMessage(result.message ?? "Your password has been updated successfully.");
        reset();
      },
      onError: (error) => {
        setFormError(
          getApiErrorMessage(error, "Unable to change your password. Please try again.")
        );
      },
    });
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      {formError && <Alert variant="error">{formError}</Alert>}
      {successMessage && <Alert variant="success">{successMessage}</Alert>}

      <PasswordField
        label="Current password"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...register("currentPassword")}
      />

      <PasswordField
        label="New password"
        autoComplete="new-password"
        hint="At least 8 characters, with upper/lowercase letters, a number, and a special character."
        error={errors.newPassword?.message}
        {...register("newPassword")}
      />

      <PasswordField
        label="Confirm new password"
        autoComplete="new-password"
        error={errors.confirmNewPassword?.message}
        {...register("confirmNewPassword")}
      />

      <div>
        <Button type="submit" isLoading={changePasswordMutation.isPending}>
          Update password
        </Button>
      </div>
    </form>
  );
}
