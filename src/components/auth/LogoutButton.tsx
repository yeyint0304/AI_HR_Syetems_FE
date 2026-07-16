"use client";

import { useLogout } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";

export function LogoutButton() {
  const logoutMutation = useLogout();

  return (
    <Button
      type="button"
      variant="ghost"
      isLoading={logoutMutation.isPending}
      onClick={() => logoutMutation.mutate()}
      className="border border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white"
    >
      Sign out
    </Button>
  );
}
