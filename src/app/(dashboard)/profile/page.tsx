import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAuthUser } from "@/lib/server/authCookies";
import { UpdateProfileForm } from "@/components/auth/UpdateProfileForm";

export const metadata: Metadata = { title: "Update profile | HR System" };

export default async function ProfilePage() {
  const user = await getCurrentAuthUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900">Update profile</h1>
      <p className="mt-1 text-sm text-slate-500">Keep your personal details up to date.</p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <UpdateProfileForm
          initialValues={{
            firstName: user.firstName ?? "",
            lastName: user.lastName ?? "",
            email: user.email,
            countryId: user.countryId ?? "",
            username: user.username ?? "",
          }}
        />
      </div>
    </div>
  );
}
