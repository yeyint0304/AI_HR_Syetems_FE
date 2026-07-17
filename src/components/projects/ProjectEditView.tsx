"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { useProject } from "@/hooks/useProjects";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";
import { toDateInputValue } from "@/lib/utils/date";

interface ProjectEditViewProps {
  projectId: string;
}

/**
 * `/projects/[id]` — fetches the project (`useProject`) and, once loaded,
 * renders the shared `ProjectForm` pre-filled with its current values, per
 * the wireframe's "Edit Project" screen.
 */
export function ProjectEditView({ projectId }: ProjectEditViewProps) {
  const { data: project, isLoading, isError, error, refetch } = useProject(projectId);

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900">Edit Project</h1>
      {project && <p className="mt-1 text-sm text-slate-500">{project.code}</p>}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {isLoading ? (
          <p className="text-sm text-slate-500" role="status">
            Loading project…
          </p>
        ) : isError ? (
          <div>
            <Alert variant="error">{getApiErrorMessage(error, "Unable to load this project.")}</Alert>
            <div className="mt-3">
              <Button type="button" variant="secondary" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          </div>
        ) : !project ? (
          <p className="text-sm text-slate-500">Project not found.</p>
        ) : (
          <ProjectForm
            mode="edit"
            projectId={projectId}
            initialValues={{
              name: project.name,
              code: project.code,
              clientName: project.clientName,
              clientEmail: project.clientEmail,
              startDate: toDateInputValue(project.startDate),
              endDate: toDateInputValue(project.endDate),
              maxDailyHours: project.maxDailyHours,
              description: project.description ?? "",
              isActive: project.isActive,
            }}
          />
        )}
      </div>
    </div>
  );
}
