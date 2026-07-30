"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { UserMenu } from "@/components/layout/UserMenu";
import { getBreadcrumbTrail } from "@/lib/constants/navigation.constants";
import type { AuthUser } from "@/types/auth.types";

interface TopbarProps {
  user: AuthUser | null;
  onOpenMobileNav: () => void;
}

/**
 * Light top bar shown above the page content: breadcrumb (full ancestor
 * trail, e.g. "Dashboard / Projects / New project") on the left, mobile nav
 * toggle, and an account dropdown (`UserMenu`) on the right — per the
 * wireframe's header icon + dropdown (`docs/HR_System_FE_wireframe.pdf`).
 */
export function Topbar({ user, onOpenMobileNav }: TopbarProps) {
  const pathname = usePathname();
  const trail = getBreadcrumbTrail(pathname ?? "/home");

  return (
    <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
        </button>

        <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
          <ol className="flex items-center gap-1.5">
            {trail.map((item, index) => {
              // Only the trail's final entry (and only when there's more than
              // one crumb) is the non-navigable "current page" — every other
              // crumb, including a lone "Dashboard" on the dashboard route
              // itself, is a real link.
              const isCurrentPage = index === trail.length - 1 && trail.length > 1;
              return (
                <Fragment key={`${item.label}-${index}`}>
                  {index > 0 && (
                    <li aria-hidden="true" className="text-slate-300">
                      /
                    </li>
                  )}
                  <li
                    className={isCurrentPage ? "font-medium text-slate-900" : undefined}
                    aria-current={isCurrentPage ? "page" : undefined}
                  >
                    {item.href && !isCurrentPage ? (
                      <Link href={item.href} className="hover:text-slate-700">
                        {item.label}
                      </Link>
                    ) : (
                      item.label
                    )}
                  </li>
                </Fragment>
              );
            })}
          </ol>
        </nav>
      </div>

      {user && <UserMenu user={user} />}
    </header>
  );
}
