"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getProject, isProjectCodeTaken, ProjectInput, setProjectStatus, updateProject } from "@/lib/mockProjects";
import { Project } from "@/types/project";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useToast } from "@/components/ToastProvider";
import { ChevronLeftIcon } from "@/components/icons";

type FieldErrors = Partial<Record<keyof ProjectInput, string>>;

function toFormState(project: Project): ProjectInput {
  return {
    code: project.code,
    name: project.name,
    client: project.client,
    status: project.status,
    startDate: project.startDate,
    endDate: project.endDate,
    description: project.description,
  };
}

export default function EditProjectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [project, setProject] = useState<Project | undefined>(() => getProject(params.id));
  const [formState, setFormState] = useState<ProjectInput>(() =>
    project
      ? toFormState(project)
      : { code: "", name: "", client: "", status: "Active", startDate: "", endDate: "", description: "" },
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  if (!project) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Project not found</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This project may have been removed.
        </p>
      </div>
    );
  }

  function updateField<K extends keyof ProjectInput>(key: K, value: string) {
    setFormState((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!formState.name.trim()) errors.name = "Project name is required.";

    if (!formState.code.trim()) errors.code = "Project code is required.";
    else if (isProjectCodeTaken(formState.code, project!.id)) errors.code = "This project code is already taken.";

    if (!formState.client.trim()) errors.client = "Client name is required.";
    if (!formState.startDate) errors.startDate = "Start date is required.";
    if (!formState.endDate) errors.endDate = "End date is required.";
    else if (formState.startDate && formState.endDate < formState.startDate) {
      errors.endDate = "End date must be after the start date.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!validate()) return;

    try {
      updateProject(project!.id, formState);
      showToast("Project updated successfully!", "success");
      router.push("/projects");
    } catch {
      setFormError("Unable to update project.");
      showToast("Unable to update project.", "error");
    }
  }

  function handleConfirmDeactivate() {
    const updated = setProjectStatus(project!.id, "Inactive");
    setProject(updated);
    setFormState((prev) => ({ ...prev, status: "Inactive" }));
    setShowDeactivateModal(false);
    showToast("Project deactivated successfully!", "success");
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
          <h1 className="text-2xl font-semibold">Edit Project</h1>
          <p className="font-mono text-sm text-zinc-500 dark:text-zinc-400">{project.code}</p>
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
          value={formState.name}
          onChange={(value) => updateField("name", value)}
          error={fieldErrors.name}
        />

        <div className="grid grid-cols-2 gap-4">
          <Field
            id="code"
            label="Project code"
            required
            helperText="Unique, uppercase letters and hyphens."
            value={formState.code}
            onChange={(value) => updateField("code", value)}
            error={fieldErrors.code}
          />
          <Field
            id="client"
            label="Client name"
            required
            value={formState.client}
            onChange={(value) => updateField("client", value)}
            error={fieldErrors.client}
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
            value={formState.status}
            onChange={(event) => updateField("status", event.target.value)}
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
            value={formState.description}
            onChange={(event) => updateField("description", event.target.value)}
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/20"
          />
        </div>

        <div className="flex items-center justify-between border-t border-black/10 pt-5 dark:border-white/10">
          <button
            type="button"
            disabled={project.status === "Inactive"}
            onClick={() => setShowDeactivateModal(true)}
            className="text-sm font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:no-underline dark:text-red-400"
          >
            Deactivate project
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push("/projects")}
              className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Save changes
            </button>
          </div>
        </div>
      </form>

      <ConfirmModal
        open={showDeactivateModal}
        title="Deactivate project"
        description={`Are you sure you want to deactivate "${project.name}"? It will be hidden from active project lists but existing data will be preserved.`}
        confirmLabel="Deactivate"
        onConfirm={handleConfirmDeactivate}
        onCancel={() => setShowDeactivateModal(false)}
      />
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
  helperText?: string;
}

function Field({ id, label, value, onChange, error, type = "text", required, helperText }: FieldProps) {
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
