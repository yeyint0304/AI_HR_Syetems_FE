"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ usernameOrEmail?: string; password?: string }>(
    {},
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const errors: typeof fieldErrors = {};
    if (!usernameOrEmail.trim()) errors.usernameOrEmail = "Username or email is required.";
    if (!password) errors.password = "Password is required.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      login(usernameOrEmail, password);
      router.push("/");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to log in right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-black/10 p-6 dark:border-white/15">
        <h1 className="mb-1 text-xl font-semibold">Log in</h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Sign in to the AI HR System.
        </p>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {formError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {formError}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="usernameOrEmail" className="text-sm font-medium">
              Username or email
            </label>
            <input
              id="usernameOrEmail"
              autoComplete="username"
              value={usernameOrEmail}
              onChange={(event) => setUsernameOrEmail(event.target.value)}
              aria-invalid={Boolean(fieldErrors.usernameOrEmail)}
              aria-describedby={fieldErrors.usernameOrEmail ? "usernameOrEmail-error" : undefined}
              className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/20"
            />
            {fieldErrors.usernameOrEmail && (
              <p id="usernameOrEmail-error" role="alert" className="text-sm text-red-600 dark:text-red-400">
                {fieldErrors.usernameOrEmail}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? "password-error" : undefined}
              className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/20"
            />
            {fieldErrors.password && (
              <p id="password-error" role="alert" className="text-sm text-red-600 dark:text-red-400">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isSubmitting ? "Logging in…" : "Log in"}
          </button>

          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Demo account (mock data): <code>admin</code> / <code>Password@123</code>
          </p>
        </form>
      </div>
    </main>
  );
}
