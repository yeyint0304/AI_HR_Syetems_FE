import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAuthUser } from "@/lib/server/authCookies";
import { ProfileView } from "@/components/auth/ProfileView";

export const metadata: Metadata = { title: "Profile | HR System" };

export default async function ProfilePage() {
  const user = await getCurrentAuthUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="max-w-2xl">
      <ProfileView user={user} />
    </div>
  );
}
