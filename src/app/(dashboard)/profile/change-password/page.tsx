import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/server/authCookies";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";

export const metadata: Metadata = { title: "Change password | HR System" };

export default async function ChangePasswordPage() {
  const accessToken = await getAccessToken();
  const claims = accessToken ? decodeJwt(accessToken) : null;
  const user = claims ? mapClaimsToAuthUser(claims) : null;

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900">Change password</h1>
      <p className="mt-1 text-sm text-slate-500">
        Choose a strong password you don&apos;t use anywhere else.
      </p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
