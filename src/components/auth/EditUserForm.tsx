"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { SelectField } from "@/components/ui/SelectField";
import { CountrySelectField } from "@/components/ui/CountrySelectField";
import { Alert } from "@/components/ui/Alert";
import { updateUserSchema, type UpdateUserFormValues } from "@/lib/validators/auth.validators";
import { useRoles, useUpdateUser } from "@/hooks/useAuth";
import { useCountryList } from "@/hooks/useCountries";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";
import type { UserListItem } from "@/types/auth.types";

export interface EditUserFormProps {
  user: UserListItem;
  /**
   * Whether `user` is the currently signed-in account. When `true`, the
   * "Status" field is disabled — mirrors the self-row guard on the
   * "Deactivate"/"Activate" table action in `UsersListView`, so a SystemAdmin
   * can't lock themselves out of the app by flipping their own account
   * inactive from this modal instead of that button.
   */
  isSelf?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Edit form for the `/admin/users` "User Management" table's "Edit" action,
 * rendered inside a `Modal` by `UsersListView` — the same "pre-filled modal"
 * pattern the wireframe uses for every other Administration list
 * (`docs/HR_System_FE_wireframe.pdf`: Currencies/Countries/Rate Cards' "Edit
 * -> pre-filled modal"; see `components/currencies/CurrencyForm.tsx` for the
 * sibling pattern). Unlike `CreateUserForm` (a full page, since creating a
 * user also requires a temporary password), this stays a modal: `Auth/
 * UpdateUser` needs no password, so the form is short enough to fit, and —
 * more importantly — the backend exposes no "get user by id" endpoint (only
 * `Auth/GetUserList`/`Auth/SearchUsers`), so editing has to reuse the row
 * data this screen already fetched rather than navigating to a page that
 * would need to re-fetch a single user by id.
 *
 * `Auth/GetUserList` only returns the user's *role name*, never a `roleId`
 * (see `types/auth.types.ts#UpdateUserRequest`), so the "Role" field can't be
 * pre-selected the way `CreateUserForm` does — instead it defaults to a
 * "Keep current role" option (submitted as `roleId: null`, which the backend
 * treats as "no change", per its saved `Auth/UpdateUser` Postman example).
 *
 * `isSelf` disables the "Status" field when the row being edited is the
 * signed-in user — the same self-lockout guard `UsersListView`'s
 * "Deactivate"/"Activate" row action already enforces, applied here too so
 * there's no second path to the same lockout via this modal.
 */
export function EditUserForm({ user, isSelf = false, onSuccess, onCancel }: EditUserFormProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const updateMutation = useUpdateUser(user.id);
  const { data: roles, isLoading: isRolesLoading, isError: isRolesError, error: rolesError } = useRoles();
  const {
    data: countries,
    isLoading: isCountriesLoading,
    isError: isCountriesError,
    error: countriesError,
    refetch: refetchCountries,
  } = useCountryList();

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateUserFormValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      employeeId: user.employeeId ?? "",
      countryId: user.countryId ?? "",
      isActive: user.isActive,
      roleId: "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    updateMutation.mutate(
      {
        username: values.username,
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        employeeId: values.employeeId || undefined,
        countryId: values.countryId,
        // Defense in depth: the "Status" field is disabled (and hidden from
        // interaction) whenever `isSelf` is true — this just guarantees the
        // submitted payload can never carry a stray `false` even if the
        // disabled control were somehow bypassed.
        isActive: isSelf ? true : values.isActive,
        roleId: values.roleId || null,
      },
      {
        onSuccess,
        onError: (error) => {
          setFormError(getApiErrorMessage(error, "Unable to update the user. Please try again."));
        },
      }
    );
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      {formError && <Alert variant="error">{formError}</Alert>}
      {isRolesError && (
        <Alert variant="error">{getApiErrorMessage(rolesError, "Unable to load roles.")}</Alert>
      )}
      {isCountriesError && (
        <Alert variant="error">
          {getApiErrorMessage(countriesError, "Unable to load countries.")}{" "}
          <button
            type="button"
            onClick={() => refetchCountries()}
            className="font-semibold underline underline-offset-2 hover:no-underline"
          >
            Try again
          </button>
        </Alert>
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

      <div className="grid gap-5 sm:grid-cols-2">
        <Controller
          control={control}
          name="roleId"
          render={({ field }) => (
            <SelectField
              label="Role"
              name={field.name}
              ref={field.ref}
              value={field.value ?? ""}
              onBlur={field.onBlur}
              onChange={field.onChange}
              disabled={isRolesLoading}
              hint={`Leave as "Keep current role" to leave ${user.roleName} unchanged.`}
              error={errors.roleId?.message}
              options={[
                { value: "", label: `Keep current role (${user.roleName})` },
                ...(roles ?? []).map((role) => ({ value: role.id, label: role.name })),
              ]}
            />
          )}
        />
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
              disabled={isSelf}
              hint={isSelf ? "You cannot change your own account's status." : undefined}
              error={errors.isActive?.message}
              options={[
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
            />
          )}
        />
      </div>

      <Controller
        control={control}
        name="countryId"
        render={({ field }) => (
          <CountrySelectField
            name={field.name}
            countries={countries ?? []}
            value={field.value}
            onBlur={field.onBlur}
            onChange={field.onChange}
            isLoading={isCountriesLoading}
            disabled={isCountriesLoading || (countries?.length ?? 0) === 0}
            error={errors.countryId?.message}
          />
        )}
      />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={updateMutation.isPending}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
