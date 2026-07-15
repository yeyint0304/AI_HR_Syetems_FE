import { describe, expect, it } from "vitest";
import { getBreadcrumbs } from "../breadcrumbs";

describe("getBreadcrumbs", () => {
  it("returns just Dashboard for the root path", () => {
    expect(getBreadcrumbs("/")).toEqual([{ label: "Dashboard", href: "/" }]);
  });

  it("builds breadcrumbs for the projects list", () => {
    expect(getBreadcrumbs("/projects")).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "Projects" },
    ]);
  });

  it("builds breadcrumbs for creating a new project", () => {
    expect(getBreadcrumbs("/projects/new")).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "Projects", href: "/projects" },
      { label: "New Project" },
    ]);
  });

  it("builds breadcrumbs for editing a project by id", () => {
    expect(getBreadcrumbs("/projects/42")).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "Projects", href: "/projects" },
      { label: "Edit" },
    ]);
  });

  it("builds breadcrumbs for a project's assignments page", () => {
    expect(getBreadcrumbs("/projects/42/assignments")).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "Projects", href: "/projects" },
      { label: "Edit", href: "/projects/42" },
      { label: "Assignments" },
    ]);
  });

  it("falls back to Dashboard for an unrecognized path", () => {
    expect(getBreadcrumbs("/some/unknown/path")).toEqual([{ label: "Dashboard", href: "/" }]);
  });
});
