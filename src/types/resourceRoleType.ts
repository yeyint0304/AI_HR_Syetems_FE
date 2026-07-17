/**
 * Resource role type reference data, used when assigning a user to a
 * project (`docs/HR_System_BE.postman_collection.json` -> "Reference Data -
 * Resource Role Type" folder).
 */
export interface ResourceRoleType {
  id: string;
  name: string;
  description: string | null;
}
