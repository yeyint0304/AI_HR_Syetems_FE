import { redirect } from "next/navigation";

/**
 * Root entry point. `proxy.ts` already redirects unauthenticated visitors to
 * `/login`; authenticated visitors are sent on to the protected dashboard
 * landing page at `/home` (kept as a distinct route from `/` so this file
 * doesn't collide with `src/app/(dashboard)/home/page.tsx`, which supplies
 * the header/shell layout for authenticated screens).
 */
export default function RootPage() {
  redirect("/home");
}
