"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { ROLE_LABELS } from "@/types/auth";
import { DashboardIcon, LogOutIcon, LogoIcon, ProfileIcon, ProjectsIcon, UserPlusIcon } from "@/components/icons";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: DashboardIcon },
  { href: "/projects", label: "Projects", icon: ProjectsIcon },
  { href: "/profile", label: "Profile", icon: ProfileIcon },
  { href: "/users/new", label: "Create User", icon: UserPlusIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-slate-900 text-slate-100">
      <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-4">
        <LogoIcon className="h-8 w-8 text-blue-500" />
        <div>
          <p className="text-sm font-semibold leading-tight text-white">HR System</p>
          <p className="text-xs leading-tight text-slate-400">Time &amp; Invoice</p>
        </div>
      </div>

      <nav aria-label="Sidebar" className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="flex items-center gap-2.5 border-t border-white/10 px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
            {user.firstName[0]}
            {user.lastName[0]}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {user.firstName} {user.lastName}
            </p>
            <p className="truncate text-xs text-slate-400">{ROLE_LABELS[user.role]}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            aria-label="Sign out"
            title="Sign out"
            className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <LogOutIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
