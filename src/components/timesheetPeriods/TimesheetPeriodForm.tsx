"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Alert } from "@/components/ui/Alert";
import {
  createTimesheetPeriodSchema,
  type CreateTimesheetPeriodFormValues,
} from "@/lib/validators/timesheetPeriod.validators";
import { useCreateTimesheetPeriod } from "@/hooks/useTimesheetPeriods";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";

const DEFAULT_VALUES: CreateTimesheetPeriodFormValues = {
  periodStart: "",
  periodEnd: "",
};

/**
 * `/timesheet-periods/new` — create form for a new payroll timesheet period,
 * per `TimesheetPeriod/CreateTimesheetPeriod`. The backend has no Update
 * endpoint for this resource (only Create/Lock/Unlock/Delete), so this form
 * is create-only — unlike `ProjectForm`, there is no `mode="edit"` variant.
 */
export function TimesheetPeriodForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const createTimesheetPeriodMutation = useCreateTimesheetPeriod();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTimesheetPeriodFormValues>({
    resolver: zodResolver(createTimesheetPeriodSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    createTimesheetPeriodMutation.mutate(values, {
      onSuccess: () => {
        router.push("/timesheet-periods");
        router.refresh();
      },
      onError: (error) => {
        setFormError(
          getApiErrorMessage(error, "Unable to create the timesheet period. Please try again.")
        );
      },
    });
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      {formError && <Alert variant="error">{formError}</Alert>}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Period start"
          type="date"
          error={errors.periodStart?.message}
          {...register("periodStart")}
        />
        <TextField
          label="Period end"
          type="date"
          error={errors.periodEnd?.message}
          {...register("periodEnd")}
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => router.push("/timesheet-periods")}>
          Cancel
        </Button>
        <Button type="submit" isLoading={createTimesheetPeriodMutation.isPending}>
          Save period
        </Button>
      </div>
    </form>
  );
}
