"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createProject, mapProjectFieldErrors } from "@/lib/api/projects";
import { ApiError } from "@/lib/apiClient";
import { ProjectInput } from "@/types/project";
import { useToast } from "@/components/ToastProvider";
import { ChevronLeftIcon } from "@/components/icons";

const initialFormState: ProjectInput = {
  code: "",
  name: "",
  clientName: "",
  isActive: true,
  startDate: "",
  endDate: "",
  description: "",
};

type FieldErrors = Partial<Record<keyof ProjectInput, string>>;

export default function NewProjectPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [formState, setFormState] = useState<ProjectInput>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof ProjectInput>(key: K, value: ProjectInput[K]) {
    setFormState((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!formState.name.trim()) errors.name = "Project name is required.";
    if (!formState.code.trim()) errors.code = "Project code is required.";
    if (!formState.clientName.trim()) errors.clientName = "Client name is required.";
    if (!formState.startDate) errors.startDate = "Start date is required.";
    if (!formState.endDate) errors.endDate = "End date is required.";
    else if (formState.startDate && formState.endDate < formState.startDate) {
      errors.endDate = "End date must be after the start date.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await createProject(formState);
      showToast("Project created successfully!", "success");
      router.push("/projects");
    } catch (error) {
      if (error instanceof ApiError) {
        const mapped = mapProjectFieldErrors(error.fieldErrors);
        if (Object.keys(mapped).length > 0) {
          setFieldErrors((prev) => ({ ...prev, ...mapped }));
        }
        setFormError(error.message);
        showToast(error.message, "error");
      } else {
        setFormError("Unable to create project.");
        showToast("Unable to create project.", "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link
          href="/projects"
          aria-label="Back to projects"
          className="rounded-md border border-black/15 p-1.5 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">New Project</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Create a new client project.</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex max-w-2xl flex-col gap-5 rounded-lg border border-black/10 p-6 dark:border-white/15"
      >
        {formError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {formError}
          </p>
        )}

        <Field
          id="name"
          label="Project name"
          required
          placeholder="e.g. Project Alpha - Web Platform"
          value={formState.name}
          onChange={(value) => updateField("name", value)}
          error={fieldErrors.name}
        />

        <div className="grid grid-cols-2 gap-4">
          <Field
            id="code"
            label="Project code"
            required
            placeholder="e.g. PRJ-GAMMA"
            helperText="Unique, uppercase letters and hyphens."
            value={formState.code}
            onChange={(value) => updateField("code", value)}
            error={fieldErrors.code}
          />
          <Field
            id="client"
            label="Client name"
            required
            placeholder="e.g. Acme Corp"
            value={formState.clientName}
            onChange={(value) => updateField("clientName", value)}
            error={fieldErrors.clientName}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field
            id="startDate"
            label="Start date"
            required
            type="date"
            value={formState.startDate}
            onChange={(value) => updateField("startDate", value)}
            error={fieldErrors.startDate}
          />
          <Field
            id="endDate"
            label="End date"
            required
            type="date"
            value={formState.endDate}
            onChange={(value) => updateField("endDate", value)}
            error={fieldErrors.endDate}
          />
        </div>

        <div className="flex max-w-[calc(50%-0.5rem)] flex-col gap-1.5">
          <label htmlFor="status" className="text-sm font-medium">
            Status
          </label>
          <select
            id="status"
            value={formState.isActive ? "Active" : "Inactive"}
            onChange={(event) => updateField("isActive", event.target.value === "Active")}
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/20"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            placeholder="Optional project description…"
            value={formState.description}
            onChange={(event) => updateField("description", event.target.value)}
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/20"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/projects")}
            className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Saving…" : "Save project"}
          </button>
        </div>
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
  required?: boolean;
  placeholder?: string;
  helperText?: string;
}

function Field({ id, label, value, onChange, error, type = "text", required, placeholder, helperText }: FieldProps) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500"> *</span>}
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
      {helperText && !error && (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">{helperText}</p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
