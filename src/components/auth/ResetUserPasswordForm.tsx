"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { PasswordField } from "@/components/ui/PasswordField";
import { Alert } from "@/components/ui/Alert";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@/lib/validators/auth.validators";
import { useResetUserPassword } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";

export interface ResetUserPasswordFormProps {
  userId: string;
  /** Shown above the fields so the admin can confirm which account they're resetting. */
  userLabel: string;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * SystemAdmin-only "Reset password" form for the `/admin/users` "User
 * Management" table (`components/auth/UsersListView.tsx`), rendered inside a
 * pre-filled-pattern `Modal` — matching the "Edit -> modal" convention used
 * throughout Administration (`components/auth/EditUserForm.tsx`). Unlike
 * `ChangePasswordForm` (self-service, requires the caller's own *current*
 * password via `Auth/ChangePassword`), this has no `currentPassword` field:
 * `Auth/ResetPassword/{id}` lets a SystemAdmin set another user's password
 * directly (see `types/auth.types.ts#ResetPasswordRequest`'s doc comment).
 */
export function ResetUserPasswordForm({
  userId,
  userLabel,
  onSuccess,
  onCancel,
}: ResetUserPasswordFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const resetPasswordMutation = useResetUserPassword(userId);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmNewPassword: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    resetPasswordMutation.mutate(values, {
      onSuccess: () => {
        onSuccess();
      },
      onError: (error) => {
        setFormError(
          getApiErrorMessage(error, "Unable to reset this user's password. Please try again.")
        );
      },
    });
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      {formError && <Alert variant="error">{formError}</Alert>}

      <p className="text-sm text-slate-600">
        Set a new password for <span className="font-semibold text-slate-900">{userLabel}</span>. They
        will need to sign in with this new password.
      </p>

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

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={resetPasswordMutation.isPending}>
          Reset password
        </Button>
      </div>
    </form>
  );
}
