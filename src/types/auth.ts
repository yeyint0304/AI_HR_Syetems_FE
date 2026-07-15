export type Role = "SYSTEM_ADMIN" | "PROJECT_ADMIN" | "ASSIGNED_USER";

export const ROLE_LABELS: Record<Role, string> = {
  SYSTEM_ADMIN: "System Admin",
  PROJECT_ADMIN: "Project Admin",
  ASSIGNED_USER: "Assigned User",
};

export interface AuthUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  countryCode: string;
  jobRole: string;
}
