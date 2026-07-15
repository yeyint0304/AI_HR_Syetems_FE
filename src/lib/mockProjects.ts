import { Project, ProjectStatus } from "@/types/project";

const PROJECTS_STORAGE_KEY = "hr_mock_projects_v1";

// Mock data only — no real backend. Good for local demoing of project CRUD flows.
const SEED_PROJECTS: Project[] = [
  {
    id: "1",
    code: "PRJ-ALPHA",
    name: "Project Alpha",
    client: "Acme Corp",
    status: "Active",
    startDate: "2026-01-01",
    endDate: "2026-06-30",
    description: "Core platform revamp for Acme Corp.",
    assignedUserIds: ["u-3"],
  },
  {
    id: "2",
    code: "PRJ-BETA",
    name: "Project Beta",
    client: "Globex Inc",
    status: "Active",
    startDate: "2026-02-01",
    endDate: "2026-12-31",
    description: "Data migration and reporting rollout for Globex.",
    assignedUserIds: [],
  },
];

function loadProjects(): Project[] {
  if (typeof window === "undefined") return SEED_PROJECTS;

  try {
    const raw = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!raw) return SEED_PROJECTS;
    const persisted = JSON.parse(raw) as Project[];
    return Array.isArray(persisted) && persisted.length > 0 ? persisted : SEED_PROJECTS;
  } catch {
    return SEED_PROJECTS;
  }
}

let projects: Project[] = loadProjects();

function persistProjects() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
}

export function listProjects(): Project[] {
  return projects;
}

export function getProject(id: string): Project | undefined {
  return projects.find((project) => project.id === id);
}

export function isProjectCodeTaken(code: string, excludeId?: string): boolean {
  const needle = code.trim().toLowerCase();
  return projects.some(
    (project) => project.code.toLowerCase() === needle && project.id !== excludeId,
  );
}

export interface ProjectInput {
  code: string;
  name: string;
  client: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  description: string;
}

export function createProject(input: ProjectInput): Project {
  const newProject: Project = {
    id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    code: input.code.trim(),
    name: input.name.trim(),
    client: input.client.trim(),
    status: input.status,
    startDate: input.startDate,
    endDate: input.endDate,
    description: input.description.trim(),
    assignedUserIds: [],
  };

  projects = [...projects, newProject];
  persistProjects();
  return newProject;
}

export function updateProject(id: string, input: ProjectInput): Project {
  let updated: Project | undefined;

  projects = projects.map((project) => {
    if (project.id !== id) return project;
    updated = {
      ...project,
      code: input.code.trim(),
      name: input.name.trim(),
      client: input.client.trim(),
      status: input.status,
      startDate: input.startDate,
      endDate: input.endDate,
      description: input.description.trim(),
    };
    return updated;
  });

  if (!updated) {
    throw new Error("Project not found.");
  }

  persistProjects();
  return updated;
}

export function setProjectStatus(id: string, status: ProjectStatus): Project {
  let updated: Project | undefined;

  projects = projects.map((project) => {
    if (project.id !== id) return project;
    updated = { ...project, status };
    return updated;
  });

  if (!updated) {
    throw new Error("Project not found.");
  }

  persistProjects();
  return updated;
}

export function assignUserToProject(projectId: string, userId: string): Project {
  let updated: Project | undefined;

  projects = projects.map((project) => {
    if (project.id !== projectId) return project;
    if (project.assignedUserIds.includes(userId)) {
      updated = project;
      return project;
    }
    updated = { ...project, assignedUserIds: [...project.assignedUserIds, userId] };
    return updated;
  });

  if (!updated) {
    throw new Error("Project not found.");
  }

  persistProjects();
  return updated;
}

export function removeUserFromProject(projectId: string, userId: string): Project {
  let updated: Project | undefined;

  projects = projects.map((project) => {
    if (project.id !== projectId) return project;
    updated = {
      ...project,
      assignedUserIds: project.assignedUserIds.filter((id) => id !== userId),
    };
    return updated;
  });

  if (!updated) {
    throw new Error("Project not found.");
  }

  persistProjects();
  return updated;
}
