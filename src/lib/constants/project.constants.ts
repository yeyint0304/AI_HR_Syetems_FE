import { USER_ROLES, type UserRole } from "@/lib/constants/auth.constants";

/**
 * Roles allowed to create/update/delete projects and manage resource
 * assignments. Per the wireframe (`docs/HR_System_FE_wireframe.pdf`), "Sarah
 * Chen — Project Admin" performs all project-management actions, and
 * SystemAdmin has at least the same access. Regular `User`/`Guest` roles can
 * still view the read-only Projects list: unlike the `Administration`
 * section, the sidebar's `Projects` entry (`lib/constants/navigation.constants.ts`)
 * is not restricted to a single role.
 */
export const PROJECT_MANAGER_ROLES: readonly UserRole[] = [
  USER_ROLES.SYSTEM_ADMIN,
  USER_ROLES.PROJECT_ADMIN,
];

/** Returns true if the given role may create/update/delete projects or manage assignments. */
export function canManageProjects(role: string | null | undefined): boolean {
  if (!role) return false;
  return (PROJECT_MANAGER_ROLES as readonly string[]).includes(role);
}
