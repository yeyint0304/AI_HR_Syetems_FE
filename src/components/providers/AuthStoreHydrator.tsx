"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth.store";
import type { AuthUser } from "@/types/auth.types";

interface AuthStoreHydratorProps {
  user: AuthUser | null;
}

/**
 * Syncs the server-derived (decoded-JWT-cookie) user into the client-side
 * Zustand store on mount/navigation. Renders nothing. This avoids an extra
 * client-side fetch just to know "who am I" — the Server Component layout
 * already decoded it from the httpOnly cookie.
 */
export function AuthStoreHydrator({ user }: AuthStoreHydratorProps) {
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    setUser(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run whenever the server-provided user changes
  }, [user?.id, user?.email, user?.role, user?.firstName, user?.lastName]);

  return null;
}
