"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { PasswordField } from "@/components/ui/PasswordField";
import { SelectField } from "@/components/ui/SelectField";
import { Alert } from "@/components/ui/Alert";
import { createUserSchema, type CreateUserFormValues } from "@/lib/validators/auth.validators";
import { useCreateUser, useRoles } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";

export function CreateUserForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const createUserMutation = useCreateUser();
  const { data: roles, isLoading: isRolesLoading, isError: isRolesError, error: rolesError } = useRoles();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      employeeId: "",
      countryId: "",
      roleId: "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    setSuccessMessage(null);
    createUserMutation.mutate(
      {
        ...values,
        employeeId: values.employeeId || undefined,
        countryId: values.countryId || null,
      },
      {
        onSuccess: () => {
          setSuccessMessage("User created successfully.");
          reset();
        },
        onError: (error) => {
          setFormError(getApiErrorMessage(error, "Unable to create the user. Please try again."));
        },
      }
    );
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      {formError && <Alert variant="error">{formError}</Alert>}
      {successMessage && <Alert variant="success">{successMessage}</Alert>}
      {isRolesError && (
        <Alert variant="error">{getApiErrorMessage(rolesError, "Unable to load roles.")}</Alert>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="First name" error={errors.firstName?.message} {...register("firstName")} />
        <TextField label="Last name" error={errors.lastName?.message} {...register("lastName")} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Username" autoComplete="off" error={errors.username?.message} {...register("username")} />
        <TextField
          label="Employee ID"
          hint="Optional."
          autoComplete="off"
          error={errors.employeeId?.message}
          {...register("employeeId")}
        />
      </div>

      <TextField
        label="Email address"
        type="email"
        autoComplete="off"
        error={errors.email?.message}
        {...register("email")}
      />

      <PasswordField
        label="Temporary password"
        autoComplete="new-password"
        hint="At least 8 characters, with upper/lowercase letters, a number, and a special character."
        error={errors.password?.message}
        {...register("password")}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Controller
          control={control}
          name="roleId"
          render={({ field }) => (
            <SelectField
              label="Role"
              name={field.name}
              ref={field.ref}
              value={field.value}
              onBlur={field.onBlur}
              onChange={field.onChange}
              disabled={isRolesLoading || (roles?.length ?? 0) === 0}
              placeholder={
                isRolesLoading
                  ? "Loading roles…"
                  : (roles?.length ?? 0) === 0
                    ? "No roles available"
                    : "Select a role..."
              }
              error={errors.roleId?.message}
              options={(roles ?? []).map((role) => ({ value: role.id, label: role.name }))}
            />
          )}
        />
        <TextField
          label="Country ID"
          hint="Optional."
          error={errors.countryId?.message}
          {...register("countryId")}
        />
      </div>

      <div>
        <Button type="submit" isLoading={createUserMutation.isPending}>
          Create user
        </Button>
      </div>
    </form>
  );
}
