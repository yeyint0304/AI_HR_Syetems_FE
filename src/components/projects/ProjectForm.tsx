"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { SelectField } from "@/components/ui/SelectField";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  updateProjectSchema,
  type UpdateProjectFormValues,
} from "@/lib/validators/project.validators";
import { useCreateProject, useUpdateProject } from "@/hooks/useProjects";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";

export type ProjectFormInitialValues = UpdateProjectFormValues;

export interface ProjectFormProps {
  mode: "create" | "edit";
  /** Required when `mode === "edit"`. */
  projectId?: string;
  /** Required when `mode === "edit"`; ignored (defaults applied) when `mode === "create"`. */
  initialValues?: ProjectFormInitialValues;
}

const DEFAULT_VALUES: ProjectFormInitialValues = {
  name: "",
  code: "",
  clientName: "",
  clientEmail: "",
  startDate: "",
  endDate: "",
  maxDailyHours: 8,
  description: "",
  isActive: true,
};

/**
 * Shared create/edit form for the Project feature, per the `/projects/new`
 * and `/projects/[id]` wireframe screens. `Client email` and `Max daily
 * hours` are not shown in the wireframe mock but are required by the real
 * `Project/CreateProject` / `Project/UpdateProject` contract (see
 * `docs/HR_System_BE.postman_collection.json`), so they're included here.
 *
 * `Status` is only editable in `edit` mode: `Project/CreateProject` doesn't
 * accept `IsActive` (new projects always start Active), so in `create` mode
 * the field is shown disabled for wireframe parity and stripped from the
 * outgoing payload; "Deactivate project" (edit mode only) submits an update
 * with `isActive: false` via `Project/UpdateProject`.
 */
export function ProjectForm({ mode, projectId, initialValues }: ProjectFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject(projectId ?? "");

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateProjectFormValues>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: initialValues ?? DEFAULT_VALUES,
  });

  const isSubmitting = createProjectMutation.isPending || updateProjectMutation.isPending;

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    const description = values.description || undefined;

    if (mode === "create") {
      const { name, code, clientName, clientEmail, startDate, endDate, maxDailyHours } = values;
      createProjectMutation.mutate(
        { name, code, clientName, clientEmail, startDate, endDate, maxDailyHours, description },
        {
          onSuccess: () => {
            router.push("/projects");
            router.refresh();
          },
          onError: (error) => {
            setFormError(getApiErrorMessage(error, "Unable to create the project. Please try again."));
          },
        }
      );
      return;
    }

    updateProjectMutation.mutate(
      { ...values, description },
      {
        onSuccess: () => {
          router.push("/projects");
          router.refresh();
        },
        onError: (error) => {
          setFormError(getApiErrorMessage(error, "Unable to update the project. Please try again."));
        },
      }
    );
  });

  function handleDeactivate() {
    if (!initialValues) return;
    setFormError(null);
    updateProjectMutation.mutate(
      { ...initialValues, isActive: false },
      {
        onSuccess: () => {
          setShowDeactivateConfirm(false);
          router.push("/projects");
          router.refresh();
        },
        onError: (error) => {
          setShowDeactivateConfirm(false);
          setFormError(
            getApiErrorMessage(error, "Unable to deactivate the project. Please try again.")
          );
        },
      }
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      {formError && <Alert variant="error">{formError}</Alert>}

      <TextField
        label="Project name"
        placeholder="e.g. Project Alpha - Web Platform"
        error={errors.name?.message}
        {...register("name")}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Project code"
          placeholder="e.g. PRJ-GAMMA"
          hint="Unique. Uppercase letters, numbers, and hyphens."
          error={errors.code?.message}
          {...register("code")}
        />
        <TextField
          label="Client name"
          placeholder="e.g. Acme Corp"
          error={errors.clientName?.message}
          {...register("clientName")}
        />
      </div>

      <TextField
        label="Client email"
        type="email"
        placeholder="e.g. client@acme.com"
        error={errors.clientEmail?.message}
        {...register("clientEmail")}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Start date"
          type="date"
          error={errors.startDate?.message}
          {...register("startDate")}
        />
        <TextField label="End date" type="date" error={errors.endDate?.message} {...register("endDate")} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Max daily hours"
          type="number"
          min={1}
          max={24}
          step={1}
          error={errors.maxDailyHours?.message}
          {...register("maxDailyHours", { valueAsNumber: true })}
        />

        {mode === "edit" ? (
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
                error={errors.isActive?.message}
                options={[
                  { value: "true", label: "Active" },
                  { value: "false", label: "Inactive" },
                ]}
              />
            )}
          />
        ) : (
          <SelectField
            label="Status"
            value="true"
            disabled
            hint="New projects start as Active."
            options={[{ value: "true", label: "Active" }]}
            onChange={() => {}}
          />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="project-description" className="text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          id="project-description"
          rows={4}
          placeholder="Optional project description..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          {...register("description")}
        />
        {errors.description?.message && (
          <p role="alert" className="text-xs font-medium text-red-600">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          {mode === "edit" && (
            <button
              type="button"
              onClick={() => setShowDeactivateConfirm(true)}
              className="text-sm font-medium text-red-600 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
            >
              Deactivate project
            </button>
          )}
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={() => router.push("/projects")}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {mode === "create" ? "Save project" : "Save changes"}
          </Button>
        </div>
      </div>

      {mode === "edit" && (
        <ConfirmDialog
          open={showDeactivateConfirm}
          title="Deactivate project"
          description={`Are you sure you want to deactivate "${initialValues?.name}"? It will be hidden from active project lists but existing timesheet entries will be preserved.`}
          confirmLabel="Deactivate"
          isConfirming={updateProjectMutation.isPending}
          onConfirm={handleDeactivate}
          onCancel={() => setShowDeactivateConfirm(false)}
        />
      )}
    </form>
  );
}
