"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { deleteProject, getProjectById, mapProjectFieldErrors, updateProject } from "@/lib/api/projects";
import { ApiError } from "@/lib/apiClient";
import { Project, ProjectInput } from "@/types/project";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useToast } from "@/components/ToastProvider";
import { ChevronLeftIcon } from "@/components/icons";

type FieldErrors = Partial<Record<keyof ProjectInput, string>>;
type LoadState = "loading" | "loaded" | "error" | "not-found";

function toFormState(project: Project): ProjectInput {
  return {
    code: project.code,
    name: project.name,
    clientName: project.clientName ?? "",
    isActive: project.isActive,
    startDate: project.startDate ?? "",
    endDate: project.endDate ?? "",
    description: project.description ?? "",
  };
}

export default function EditProjectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [formState, setFormState] = useState<ProjectInput | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const data = await getProjectById(params.id);
      setProject(data);
      setFormState(toFormState(data));
      setLoadState("loaded");
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setLoadState("not-found");
      } else {
        setLoadError(error instanceof ApiError ? error.message : "Unable to load this project.");
        setLoadState("error");
      }
    }
  }, [params.id]);

  useEffect(() => {
    // Fetch-on-mount: `fetchProject` only sets state from its async
    // continuation once the request settles, never synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, state is set asynchronously after the request settles
    void fetchProject();
  }, [fetchProject]);

  function retryLoadProject() {
    setLoadState("loading");
    setLoadError(null);
    void fetchProject();
  }

  function updateField<K extends keyof ProjectInput>(key: K, value: ProjectInput[K]) {
    setFormState((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function validate(state: ProjectInput): boolean {
    const errors: FieldErrors = {};
    if (!state.name.trim()) errors.name = "Project name is required.";
    if (!state.code.trim()) errors.code = "Project code is required.";
    if (!state.clientName.trim()) errors.clientName = "Client name is required.";
    if (!state.startDate) errors.startDate = "Start date is required.";
    if (!state.endDate) errors.endDate = "End date is required.";
    else if (state.startDate && state.endDate < state.startDate) {
      errors.endDate = "End date must be after the start date.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!formState || !project) return;
    if (!validate(formState)) return;

    setIsSubmitting(true);
    try {
      await updateProject(project.id, formState);
      showToast("Project updated successfully!", "success");
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
        setFormError("Unable to update project.");
        showToast("Unable to update project.", "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!project) return;
    setIsDeleting(true);
    try {
      await deleteProject(project.id);
      showToast("Project deleted successfully!", "success");
      router.push("/projects");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Unable to delete project.";
      showToast(message, "error");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  }

  if (loadState === "loading") {
    return (
      <p role="status" className="text-sm text-zinc-500 dark:text-zinc-400">
        Loading project…
      </p>
    );
  }

  if (loadState === "not-found") {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Project not found</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This project may have been removed.
        </p>
      </div>
    );
  }

  if (loadState === "error" || !project || !formState) {
    return (
      <div
        role="alert"
        className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400"
      >
        <p>{loadError ?? "Unable to load this project."}</p>
        <button
          type="button"
          onClick={retryLoadProject}
          className="self-start rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium hover:bg-red-100 dark:border-red-500/40 dark:hover:bg-red-500/20"
        >
          Retry
        </button>
      </div>
    );
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
            value={formState.description}
            onChange={(event) => updateField("description", event.target.value)}
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/20"
          />
        </div>

        <div className="flex items-center justify-between border-t border-black/10 pt-5 dark:border-white/10">
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
          >
            Delete Project
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
              disabled={isSubmitting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </form>

      <ConfirmModal
        open={showDeleteModal}
        title="Delete project"
        description={`Are you sure you want to delete "${project.name}"? This action cannot be undone.`}
        confirmLabel={isDeleting ? "Deleting…" : "Delete"}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
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
