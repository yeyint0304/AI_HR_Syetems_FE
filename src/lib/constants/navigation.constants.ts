import {
  ArrowLeftRight,
  BarChart3,
  Coins,
  CreditCard,
  FolderKanban,
  Globe,
  History,
  LayoutDashboard,
  Receipt,
  Timer,
  Users,
  type LucideIcon,
} from "lucide-react";
import { USER_ROLES, type UserRole } from "@/lib/constants/auth.constants";

/**
 * Sidebar navigation model, per the dashboard/sidebar wireframe
 * (`docs/HR_System_FE_wireframe.pdf`). Kept as data rather than JSX so the
 * `Sidebar` component stays a thin renderer and new sections/items can be
 * added without touching component logic.
 *
 * `implemented: false` marks destinations from the wireframe that don't have
 * a corresponding route yet in this codebase (Project/Timesheet/Report/
 * Invoice/reference-data modules are out of scope for this design-only
 * change) — the `Sidebar` renders those as disabled, clearly-labelled
 * "coming soon" entries instead of dead links that would 404.
 */
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  implemented: boolean;
}

export interface NavSection {
  /** `null` renders the item(s) without a section heading (e.g. Dashboard). */
  label: string | null;
  items: NavItem[];
  /** Restricts the whole section to a single role, e.g. Administration. */
  requiredRole?: UserRole;
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: null,
    items: [{ label: "Dashboard", href: "/home", icon: LayoutDashboard, implemented: true }],
  },
  {
    label: "Timesheet",
    items: [
      { label: "Projects", href: "/projects", icon: FolderKanban, implemented: false },
      { label: "My Timesheets", href: "/timesheets", icon: Timer, implemented: false },
      { label: "Timesheet History", href: "/timesheets/history", icon: History, implemented: false },
    ],
  },
  {
    label: "Reports",
    items: [{ label: "Reports", href: "/reports", icon: BarChart3, implemented: false }],
  },
  {
    label: "Billing",
    items: [{ label: "Invoices", href: "/invoices", icon: Receipt, implemented: false }],
  },
  {
    label: "Administration",
    requiredRole: USER_ROLES.SYSTEM_ADMIN,
    items: [
      { label: "Users", href: "/admin/users", icon: Users, implemented: false },
      { label: "Currencies", href: "/admin/currencies", icon: Coins, implemented: false },
      { label: "Exchange Rates", href: "/admin/exchange-rates", icon: ArrowLeftRight, implemented: false },
      { label: "Rate Cards", href: "/admin/rate-cards", icon: CreditCard, implemented: false },
      { label: "Countries", href: "/admin/countries", icon: Globe, implemented: false },
    ],
  },
];

/** Static breadcrumb/page-title labels for currently implemented routes. */
const PAGE_TITLES: Record<string, string> = {
  "/home": "Dashboard",
  "/profile": "Profile",
  "/profile/change-password": "Change password",
  "/admin/users/new": "Create user",
};

/** Resolves the current page's breadcrumb label, falling back to "Dashboard". */
export function getBreadcrumbLabel(pathname: string): string {
  return PAGE_TITLES[pathname] ?? "Dashboard";
}
