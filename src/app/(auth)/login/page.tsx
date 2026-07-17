import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { MOCK_LOGIN_HINT } from "@/lib/server/mockAuth";

export const metadata: Metadata = { title: "Sign in | HR System" };

// Never true in a production build — `next build`/`next start` set
// NODE_ENV=production. Purely a local-dev/QA convenience so the mock-login
// fallback (see `lib/server/mockAuth.ts`) is actually discoverable when the
// real .NET backend isn't running.
const showMockCredentialsHint = process.env.NODE_ENV !== "production";

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

      {showMockCredentialsHint && (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
          Development mode: if the HR System backend isn&apos;t reachable, you can sign in with a
          mock account —{" "}
          {MOCK_LOGIN_HINT.map((account, index) => (
            <span key={account.usernameOrEmail}>
              {index > 0 && ", "}
              <code className="rounded bg-slate-200 px-1 py-0.5">{account.usernameOrEmail}</code> /{" "}
              <code className="rounded bg-slate-200 px-1 py-0.5">{account.password}</code>
            </span>
          ))}
          .
        </p>
      )}
    </section>
  );
}
