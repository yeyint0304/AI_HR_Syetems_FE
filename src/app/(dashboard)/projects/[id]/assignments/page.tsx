import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/server/authCookies";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageProjects } from "@/lib/constants/project.constants";
import { ProjectAssignmentsView } from "@/components/projects/ProjectAssignmentsView";

export const metadata: Metadata = { title: "Project assignments | HR System" };

interface ProjectAssignmentsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectAssignmentsPage({ params }: ProjectAssignmentsPageProps) {
  const { id } = await params;
  const accessToken = await getAccessToken();
  const claims = accessToken ? decodeJwt(accessToken) : null;
  const user = claims ? mapClaimsToAuthUser(claims) : null;

  if (!user) {
    redirect("/login");
  }

  // Defense-in-depth: `POST/DELETE /api/projects/[id]/assignments*`
  // re-check this same role requirement server-side.
  if (!canManageProjects(user.role)) {
    redirect("/projects");
  }

  return <ProjectAssignmentsView projectId={id} />;
}
