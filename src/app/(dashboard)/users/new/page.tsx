"use client";

import { FormEvent, useState } from "react";
import { createMockUser, isEmailTaken, isUsernameTaken } from "@/lib/mockUsers";
import { ROLE_LABELS, Role } from "@/types/auth";

interface FormState {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  countryCode: string;
  jobRole: string;
}

const ROLE_OPTIONS = Object.keys(ROLE_LABELS) as Role[];

const initialFormState: FormState = {
  username: "",
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  role: "ASSIGNED_USER",
  countryCode: "",
  jobRole: "",
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CreateUserPage() {
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setFormState((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!formState.username.trim()) errors.username = "Username is required.";
    else if (isUsernameTaken(formState.username)) errors.username = "This username is already taken.";

    if (!formState.email.trim()) errors.email = "Email is required.";
    else if (!EMAIL_PATTERN.test(formState.email.trim())) errors.email = "Enter a valid email address.";
    else if (isEmailTaken(formState.email)) errors.email = "This email is already in use.";

    if (!formState.password) errors.password = "Password is required.";
    else if (formState.password.length < 8) errors.password = "Password must be at least 8 characters.";

    if (!formState.firstName.trim()) errors.firstName = "First name is required.";
    if (!formState.lastName.trim()) errors.lastName = "Last name is required.";
    if (!formState.countryCode.trim()) errors.countryCode = "Country code is required.";
    if (!formState.jobRole.trim()) errors.jobRole = "Job role is required.";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!validate()) return;

    try {
      const created = createMockUser(formState);
      setFormSuccess(`User "${created.username}" created successfully.`);
      setFormState(initialFormState);
      setFieldErrors({});
    } catch {
      setFormError("Unable to create user.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Create user</h1>

      <form onSubmit={handleSubmit} noValidate className="flex max-w-md flex-col gap-4">
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
          id="username"
          label="Username"
          value={formState.username}
          onChange={(value) => updateField("username", value)}
          error={fieldErrors.username}
        />

        <Field
          id="email"
          label="Email"
          type="email"
          value={formState.email}
          onChange={(value) => updateField("email", value)}
          error={fieldErrors.email}
        />

        <Field
          id="password"
          label="Temporary password"
          type="password"
          value={formState.password}
          onChange={(value) => updateField("password", value)}
          error={fieldErrors.password}
        />

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

        <div className="flex flex-col gap-1.5">
          <label htmlFor="role" className="text-sm font-medium">
            Role
          </label>
          <select
            id="role"
            value={formState.role}
            onChange={(event) => updateField("role", event.target.value as Role)}
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/20"
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field
            id="countryCode"
            label="Country code"
            placeholder="e.g. SG"
            value={formState.countryCode}
            onChange={(value) => updateField("countryCode", value.toUpperCase())}
            error={fieldErrors.countryCode}
          />
          <Field
            id="jobRole"
            label="Job role"
            placeholder="e.g. Senior Developer"
            value={formState.jobRole}
            onChange={(value) => updateField("jobRole", value)}
            error={fieldErrors.jobRole}
          />
        </div>

        <button
          type="submit"
          className="mt-2 self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create user
        </button>
      </form>
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
}

function Field({ id, label, value, onChange, error, type = "text", placeholder }: FieldProps) {
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
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
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
