export interface BreadcrumbItem {
  label: string;
  href?: string;
}

const DASHBOARD_CRUMB: BreadcrumbItem = { label: "Dashboard", href: "/" };
const PROJECTS_CRUMB: BreadcrumbItem = { label: "Projects", href: "/projects" };

export function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  if (pathname === "/") return [DASHBOARD_CRUMB];
  if (pathname === "/profile") return [DASHBOARD_CRUMB, { label: "Profile" }];
  if (pathname === "/users/new") return [DASHBOARD_CRUMB, { label: "Create User" }];
  if (pathname === "/projects") return [DASHBOARD_CRUMB, { label: "Projects" }];
  if (pathname === "/projects/new") {
    return [DASHBOARD_CRUMB, PROJECTS_CRUMB, { label: "New Project" }];
  }

  const assignmentsMatch = pathname.match(/^\/projects\/([^/]+)\/assignments$/);
  if (assignmentsMatch) {
    const id = assignmentsMatch[1];
    return [
      DASHBOARD_CRUMB,
      PROJECTS_CRUMB,
      { label: "Edit", href: `/projects/${id}` },
      { label: "Assignments" },
    ];
  }

  const editMatch = pathname.match(/^\/projects\/([^/]+)$/);
  if (editMatch) {
    return [DASHBOARD_CRUMB, PROJECTS_CRUMB, { label: "Edit" }];
  }

  return [DASHBOARD_CRUMB];
}
