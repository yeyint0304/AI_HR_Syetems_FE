/**
 * Shared Project domain types (Data Transfer Objects), following the same
 * minimal-surface convention as `types/auth.types.ts`: only the fields the UI
 * actually renders are exposed to client code.
 *
 * Field set is derived from `docs/HR_System_BE.postman_collection.json`
 * (`Project/CreateProject`, `Project/UpdateProject`, `Project/GetProject*`,
 * `Project/AssignResource`) — the wireframe's `/projects/new` mock form only
 * shows Name/Code/Client/Dates/Status/Description, but the real backend
 * contract additionally requires `ClientEmail` and `MaxDailyHours`, so those
 * two fields are included here and rendered in the form even though they
 * aren't depicted in `docs/HR_System_FE_wireframe.pdf`.
 */

export interface Project {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  clientName: string;
  clientEmail: string;
  /** ISO date string (`yyyy-MM-dd` or full ISO datetime). */
  startDate: string;
  /** ISO date string (`yyyy-MM-dd` or full ISO datetime). */
  endDate: string;
  maxDailyHours: number;
  isActive: boolean;
}

export interface CreateProjectRequest {
  code: string;
  name: string;
  description?: string;
  clientName: string;
  clientEmail: string;
  startDate: string;
  endDate: string;
  maxDailyHours: number;
}

export interface UpdateProjectRequest extends CreateProjectRequest {
  isActive: boolean;
}

export interface ProjectAssignment {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  resourceRoleTypeId: string;
  resourceRoleTypeName?: string;
}

export interface AssignResourceRequest {
  userId: string;
  resourceRoleTypeId: string;
}

/** Reference data backing the "Resource role" dropdown on the Assignments screen. */
export interface ResourceRoleType {
  id: string;
  name: string;
  description?: string | null;
}
