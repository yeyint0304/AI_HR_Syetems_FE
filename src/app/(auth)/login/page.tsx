import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in | HR System" };

export default function LoginPage() {
  return (
    <section aria-labelledby="login-heading" className="rounded-2xl bg-white p-8 shadow-xl">
      <h2 id="login-heading" className="text-lg font-semibold text-slate-900">
        Sign in to your account
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Enter your credentials to access the HR System.
      </p>
      <div className="mt-6">
        <LoginForm />
      </div>
    </section>
  );
}
