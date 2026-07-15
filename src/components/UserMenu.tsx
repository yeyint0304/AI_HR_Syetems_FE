"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { listMockUsers } from "@/lib/mockUsers";
import { ROLE_LABELS } from "@/types/auth";
import { ChevronDownIcon, LogOutIcon } from "@/components/icons";
import { useToast } from "@/components/ToastProvider";

export function UserMenu() {
  const router = useRouter();
  const { showToast } = useToast();
  const user = useAuthStore((state) => state.user);
  const switchUser = useAuthStore((state) => state.switchUser);
  const logout = useAuthStore((state) => state.logout);

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!user) return null;

  const demoUsers = listMockUsers();

  function handleSwitchUser(userId: string) {
    if (userId === user!.id) {
      setIsOpen(false);
      return;
    }
    const switched = switchUser(userId);
    setIsOpen(false);
    showToast(`Switched to ${switched.firstName} ${switched.lastName}.`, "success");
  }

  function handleSignOut() {
    setIsOpen(false);
    logout();
    router.push("/login");
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 hover:bg-black/5 dark:hover:bg-white/10"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
          {user.firstName[0]}
          {user.lastName[0]}
        </span>
        <ChevronDownIcon className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-64 rounded-lg border border-black/10 bg-white py-2 shadow-lg dark:border-white/15 dark:bg-zinc-900"
        >
          <div className="px-3 pb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Switch demo user
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Prototype convenience only</p>
          </div>

          {demoUsers.map((demoUser) => {
            const isCurrent = demoUser.id === user.id;
            return (
              <button
                key={demoUser.id}
                type="button"
                role="menuitem"
                onClick={() => handleSwitchUser(demoUser.id)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-semibold text-white">
                  {demoUser.firstName[0]}
                  {demoUser.lastName[0]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {demoUser.firstName} {demoUser.lastName}
                  </span>
                  <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {ROLE_LABELS[demoUser.role]}
                  </span>
                </span>
                {isCurrent && <span className="text-blue-600 dark:text-blue-400">✓</span>}
              </button>
            );
          })}

          <div className="mt-1 border-t border-black/10 pt-1 dark:border-white/10">
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <LogOutIcon className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
