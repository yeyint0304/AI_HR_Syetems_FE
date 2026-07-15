"use client";

import { FormEvent, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { isEmailTaken } from "@/lib/mockUsers";

interface ProfileFormState {
  firstName: string;
  lastName: string;
  email: string;
}

type ProfileFieldErrors = Partial<Record<keyof ProfileFormState, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);

  if (!user) return null;

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <UpdateProfileForm />
      <hr className="max-w-md border-black/10 dark:border-white/15" />
      <ChangePasswordForm />
    </div>
  );
}

function UpdateProfileForm() {
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);

  const [formState, setFormState] = useState<ProfileFormState>({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    email: user?.email ?? "",
  });
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  if (!user) return null;

  function updateField<K extends keyof ProfileFormState>(key: K, value: string) {
    setFormState((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): boolean {
    const errors: ProfileFieldErrors = {};
    if (!formState.firstName.trim()) errors.firstName = "First name is required.";
    if (!formState.lastName.trim()) errors.lastName = "Last name is required.";

    if (!formState.email.trim()) errors.email = "Email is required.";
    else if (!EMAIL_PATTERN.test(formState.email.trim())) errors.email = "Enter a valid email address.";
    else if (isEmailTaken(formState.email, user!.id)) errors.email = "This email is already in use.";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!validate()) return;

    try {
      updateProfile(formState);
      setFormSuccess("Profile updated successfully.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to update profile.");
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex max-w-md flex-col gap-4">
      <h2 className="text-lg font-semibold">Update profile</h2>

      {formError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {formError}
        </p>
      )}
      {formSuccess && (
        <p role="status" className="text-sm text-green-600 dark:text-green-400">
          {formSuccess}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field
          id="firstName"
          label="First name"
          value={formState.firstName}
          onChange={(value) => updateField("firstName", value)}
          error={fieldErrors.firstName}
        />
        <Field
          id="lastName"
          label="Last name"
          value={formState.lastName}
          onChange={(value) => updateField("lastName", value)}
          error={fieldErrors.lastName}
        />
      </div>

      <Field
        id="email"
        label="Email"
        type="email"
        value={formState.email}
        onChange={(value) => updateField("email", value)}
        error={fieldErrors.email}
      />

      <button
        type="submit"
        className="mt-2 self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Save changes
      </button>
    </form>
  );
}

interface PasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

const BLANK_PASSWORD_FORM: PasswordFormState = {
  currentPassword: "",
  newPassword: "",
  confirmNewPassword: "",
};

type PasswordFieldErrors = Partial<Record<keyof PasswordFormState, string>>;

function ChangePasswordForm() {
  const changePassword = useAuthStore((state) => state.changePassword);

  // Password inputs never prefill with a real value — every render (and
  // every successful submit) starts blank.
  const [formState, setFormState] = useState<PasswordFormState>(BLANK_PASSWORD_FORM);
  const [fieldErrors, setFieldErrors] = useState<PasswordFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  function updateField<K extends keyof PasswordFormState>(key: K, value: string) {
    setFormState((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): boolean {
    const errors: PasswordFieldErrors = {};
    if (!formState.currentPassword) errors.currentPassword = "Current password is required.";

    if (!formState.newPassword) errors.newPassword = "New password is required.";
    else if (formState.newPassword.length < 8) {
      errors.newPassword = "New password must be at least 8 characters.";
    }

    if (!formState.confirmNewPassword) {
      errors.confirmNewPassword = "Please confirm the new password.";
    } else if (formState.newPassword && formState.confirmNewPassword !== formState.newPassword) {
      errors.confirmNewPassword = "Passwords do not match.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!validate()) return;

    try {
      changePassword(formState.currentPassword, formState.newPassword);
      setFormSuccess("Password changed successfully.");
      setFormState(BLANK_PASSWORD_FORM);
      setFieldErrors({});
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to change password.");
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex max-w-md flex-col gap-4">
      <h2 className="text-lg font-semibold">Change password</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Leave this section blank if you only want to update your profile above.
      </p>

      {formError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {formError}
        </p>
      )}
      {formSuccess && (
        <p role="status" className="text-sm text-green-600 dark:text-green-400">
          {formSuccess}
        </p>
      )}

      <Field
        id="currentPassword"
        label="Current password"
        type="password"
        value={formState.currentPassword}
        onChange={(value) => updateField("currentPassword", value)}
        error={fieldErrors.currentPassword}
        autoComplete="current-password"
      />

      <Field
        id="newPassword"
        label="New password"
        type="password"
        value={formState.newPassword}
        onChange={(value) => updateField("newPassword", value)}
        error={fieldErrors.newPassword}
        autoComplete="new-password"
      />

      <Field
        id="confirmNewPassword"
        label="Confirm new password"
        type="password"
        value={formState.confirmNewPassword}
        onChange={(value) => updateField("confirmNewPassword", value)}
        error={fieldErrors.confirmNewPassword}
        autoComplete="new-password"
      />

      <button
        type="submit"
        className="mt-2 self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Update password
      </button>
    </form>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
}

function Field({ id, label, value, onChange, error, type = "text", autoComplete }: FieldProps) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        autoComplete={autoComplete}
        className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/20"
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
