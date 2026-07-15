export type ProjectStatus = "Active" | "Inactive";

export interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  description: string;
  assignedUserIds: string[];
}
