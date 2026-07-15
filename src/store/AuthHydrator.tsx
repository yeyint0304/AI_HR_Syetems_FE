"use client";

import { useEffect } from "react";
import { useAuthStore } from "./authStore";

export function AuthHydrator() {
  useEffect(() => {
    void useAuthStore.persist.rehydrate();
  }, []);

  return null;
}
