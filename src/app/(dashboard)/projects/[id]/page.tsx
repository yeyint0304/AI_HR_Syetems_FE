import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/server/authCookies";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageProjects } from "@/lib/constants/project.constants";
import { ProjectEditView } from "@/components/projects/ProjectEditView";

export const metadata: Metadata = { title: "Edit project | HR System" };

interface EditProjectPageProps {
  // Next.js 16: dynamic route `params` is a Promise (see
  // node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md).
  params: Promise<{ id: string }>;
}

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const { id } = await params;
  const accessToken = await getAccessToken();
  const claims = accessToken ? decodeJwt(accessToken) : null;
  const user = claims ? mapClaimsToAuthUser(claims) : null;

  if (!user) {
    redirect("/login");
  }

  // Defense-in-depth: `PUT /api/projects/[id]` re-checks this same role
  // requirement server-side.
  if (!canManageProjects(user.role)) {
    redirect("/projects");
  }

  return <ProjectEditView projectId={id} />;
}
