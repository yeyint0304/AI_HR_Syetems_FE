import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/server/authCookies";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageProjects } from "@/lib/constants/project.constants";
import { ProjectForm } from "@/components/projects/ProjectForm";

export const metadata: Metadata = { title: "New project | HR System" };

export default async function NewProjectPage() {
  const accessToken = await getAccessToken();
  const claims = accessToken ? decodeJwt(accessToken) : null;
  const user = claims ? mapClaimsToAuthUser(claims) : null;

  if (!user) {
    redirect("/login");
  }

  // Defense-in-depth: `POST /api/projects` re-checks this same role
  // requirement server-side, and the .NET backend remains the ultimate
  // authorization boundary.
  if (!canManageProjects(user.role)) {
    redirect("/projects");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900">New Project</h1>
      <p className="mt-1 text-sm text-slate-500">Create a new client project.</p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <ProjectForm mode="create" />
      </div>
    </div>
  );
}
