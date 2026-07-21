import {
  ArrowLeftRight,
  BarChart3,
  CalendarRange,
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
 * a corresponding route yet in this codebase (the Administration reference-data
 * modules are out of scope for the current feature set) — the `Sidebar`
 * renders those as disabled, clearly-labelled "coming soon" entries instead of
 * dead links that would 404. `Projects`, `Timesheet Periods`, `My Timesheets`,
 * `Timesheet History`, `Reports`, `Invoices`, and `Users` are implemented (see
 * `src/app/(dashboard)/projects/*`, `src/app/(dashboard)/timesheet-periods/*`,
 * `src/app/(dashboard)/timesheets/*`, `src/app/(dashboard)/timesheets/history/*`,
 * `src/app/(dashboard)/reports/*`, `src/app/(dashboard)/invoices/*`, and
 * `src/app/(dashboard)/admin/users/new/*`).
 * `Invoices` has no `requiredRole` at the section level (matching the
 * wireframe, where ProjectAdmin "Sarah Chen" also sees the Billing section),
 * but each `/invoices*` page independently redirects non-SystemAdmin/ProjectAdmin
 * visitors — see `lib/constants/invoice.constants.ts`.
 *
 * The wireframe's `/admin/users` is a full "User Management" list (all users,
 * role badges, an "Add User" button) — but `docs/HR_System_BE.postman_collection.json`
 * exposes no "list all users" endpoint (only `Auth/CreateUser`, `Auth/GetRoles`,
 * and `Auth/GetUnassignedUsers`), so that list can't be backed by real data yet.
 * The "Users" item therefore links straight to the one working piece of that
 * screen — `/admin/users/new` ("Create User") — and is enabled for SystemAdmin
 * rather than left disabled, since that page is fully implemented.
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
      { label: "Projects", href: "/projects", icon: FolderKanban, implemented: true },
      {
        label: "Timesheet Periods",
        href: "/timesheet-periods",
        icon: CalendarRange,
        implemented: true,
      },
      { label: "My Timesheets", href: "/timesheets", icon: Timer, implemented: true },
      { label: "Timesheet History", href: "/timesheets/history", icon: History, implemented: true },
    ],
  },
  {
    label: "Reports",
    items: [{ label: "Reports", href: "/reports", icon: BarChart3, implemented: true }],
  },
  {
    label: "Billing",
    items: [{ label: "Invoices", href: "/invoices", icon: Receipt, implemented: true }],
  },
  {
    label: "Administration",
    requiredRole: USER_ROLES.SYSTEM_ADMIN,
    items: [
      { label: "Users", href: "/admin/users/new", icon: Users, implemented: true },
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
  "/projects": "Projects",
  "/projects/new": "New project",
  "/timesheet-periods": "Timesheet Periods",
  "/timesheet-periods/new": "New timesheet period",
  "/timesheets": "My Timesheets",
  "/timesheets/history": "Timesheet History",
  "/reports": "Reports",
  "/reports/timesheet": "Timesheet Report",
  "/reports/roles-summary": "User Roles Summary",
  "/reports/cost-revenue": "Cost & Revenue Report",
  "/invoices": "Invoices",
  "/invoices/generate": "Generate Invoice",
};

/** Matches the dynamic `/projects/[id]/assignments` route. */
const PROJECT_ASSIGNMENTS_ROUTE_PATTERN = /^\/projects\/[^/]+\/assignments$/;
/** Matches the dynamic `/projects/[id]` edit route (excludes the static `/projects/new`). */
const PROJECT_EDIT_ROUTE_PATTERN = /^\/projects\/(?!new$)[^/]+$/;
/** Matches the dynamic `/invoices/[id]` detail route (excludes the static `/invoices/generate`). */
const INVOICE_DETAIL_ROUTE_PATTERN = /^\/invoices\/(?!generate$)[^/]+$/;

/** Resolves the current page's breadcrumb label, falling back to "Dashboard". */
export function getBreadcrumbLabel(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (PROJECT_ASSIGNMENTS_ROUTE_PATTERN.test(pathname)) return "Project assignments";
  if (PROJECT_EDIT_ROUTE_PATTERN.test(pathname)) return "Edit project";
  if (INVOICE_DETAIL_ROUTE_PATTERN.test(pathname)) return "Invoice detail";
  return "Dashboard";
}
