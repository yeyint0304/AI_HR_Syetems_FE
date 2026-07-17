/**
 * Project domain types, aligned with the real backend contract
 * (`docs/HR_System_BE.postman_collection.json` -> "Project" folder).
 */

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string | null;
  clientName: string | null;
  clientEmail: string | null;
  startDate: string | null;
  endDate: string | null;
  maxDailyHours: number | null;
  isActive: boolean;
}

export interface ProjectAssignment {
  id: string;
  projectId: string;
  userId: string;
  resourceRoleTypeId: string;
}

/** Form input shared by the "New Project" and "Edit Project" pages. */
export interface ProjectInput {
  code: string;
  name: string;
  clientName: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  description: string;
}

export interface AssignResourceInput {
  userId: string;
  resourceRoleTypeId: string;
}
