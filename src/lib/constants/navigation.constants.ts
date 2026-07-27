import {
  ArrowLeftRight,
  BarChart3,
  Briefcase,
  CalendarRange,
  Coins,
  CreditCard,
  FolderKanban,
  Globe,
  History,
  LayoutDashboard,
  Receipt,
  ShieldCheck,
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
 * a corresponding route yet in this codebase — the `Sidebar` renders those as
 * disabled, clearly-labelled "coming soon" entries instead of dead links that
 * would 404. Every Administration reference-data module is now implemented:
 * `Projects`, `Timesheet Periods`, `My Timesheets`, `Timesheet History`,
 * `Reports`, `Invoices`, `Users`, `Currencies`, `Exchange Rates`, `Rate
 * Cards`, `Countries`, `Resource Role Types`, and `Roles` (see
 * `src/app/(dashboard)/projects/*`, `src/app/(dashboard)/timesheet-periods/*`,
 * `src/app/(dashboard)/timesheets/*`, `src/app/(dashboard)/timesheets/history/*`,
 * `src/app/(dashboard)/reports/*`, `src/app/(dashboard)/invoices/*`,
 * `src/app/(dashboard)/admin/users/*`, `src/app/(dashboard)/admin/currencies/*`,
 * `src/app/(dashboard)/admin/exchange-rates/*`,
 * `src/app/(dashboard)/admin/rate-cards/*`,
 * `src/app/(dashboard)/admin/countries/*`,
 * `src/app/(dashboard)/admin/resource-role-types/*`, and
 * `src/app/(dashboard)/admin/roles/*`).
 * `Invoices` has no `requiredRole` at the section level (matching the
 * wireframe, where ProjectAdmin "Sarah Chen" also sees the Billing section),
 * but each `/invoices*` page independently redirects non-SystemAdmin/ProjectAdmin
 * visitors — see `lib/constants/invoice.constants.ts`.
 *
 * The wireframe's `/admin/users` is a full "User Management" list (all users,
 * role badges, an "Add User" button) — backed by `Auth/GetUserList`
 * (`docs/HR_System_BE.postman_collection.json`), mapped to the fuller
 * `UserListItem` shape via the dedicated `GET /api/auth/users` Route Handler
 * (see `app/api/auth/users/route.ts` and `components/auth/UsersListView.tsx`).
 * The "Users" item links to this list, which itself links to the existing
 * `/admin/users/new` ("Create User") page via its "+ Add User" button.
 *
 * `Exchange Rates` and `Rate Cards` are also implemented (see
 * `src/app/(dashboard)/admin/exchange-rates/page.tsx` and
 * `src/app/(dashboard)/admin/rate-cards/page.tsx`), backed by the
 * `ExchangeRate/*`/`RateCard/*` endpoints in
 * `docs/HR_System_BE.postman_collection.json`.
 *
 * `Currencies` and `Countries` are the two remaining Administration screens
 * the wireframe depicts (`/admin/currencies`: CODE/NAME/SYMBOL/BASE
 * CURRENCY/STATUS table with a base-currency info note; `/admin/countries`:
 * COUNTRY/CODE/RATE CARDS/STATUS table) — see
 * `components/currencies/CurrenciesListView.tsx` and
 * `components/countries/CountriesListView.tsx`, backed by the
 * `Currency/*`/`Country/*` endpoints.
 *
 * `Resource Role Types` and `Roles` are *not* depicted as their own
 * Administration sidebar entries in the wireframe (only the five items
 * above it). They're added here because: (1) `ResourceRoleType` is a full
 * CRUD backend resource (`ResourceRoleType/*`) that both the Project
 * Assignments and Rate Card screens already depend on as reference data, so
 * exposing it under Administration — using the exact same list/modal
 * pattern as `Currencies`/`Countries` — lets a SystemAdmin manage it without
 * direct API access (`components/resourceRoleTypes/ResourceRoleTypesListView.tsx`);
 * (2) `Roles` surfaces the existing SystemAdmin-only `GET /api/auth/roles`
 * reference data (previously only consumed internally by the Create User
 * form's dropdown) as a small read-only reference screen — the backend
 * exposes no `CreateRole`/`UpdateRole`/`DeleteRole` endpoint, so this page
 * has no add/edit/delete actions (`components/roles/RolesListView.tsx`).
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
      { label: "Users", href: "/admin/users", icon: Users, implemented: true },
      { label: "Currencies", href: "/admin/currencies", icon: Coins, implemented: true },
      { label: "Exchange Rates", href: "/admin/exchange-rates", icon: ArrowLeftRight, implemented: true },
      { label: "Rate Cards", href: "/admin/rate-cards", icon: CreditCard, implemented: true },
      { label: "Countries", href: "/admin/countries", icon: Globe, implemented: true },
      {
        label: "Resource Role Types",
        href: "/admin/resource-role-types",
        icon: Briefcase,
        implemented: true,
      },
      { label: "Roles", href: "/admin/roles", icon: ShieldCheck, implemented: true },
    ],
  },
];

/** Static breadcrumb/page-title labels for currently implemented routes. */
const PAGE_TITLES: Record<string, string> = {
  "/home": "Dashboard",
  "/profile": "Profile",
  "/profile/change-password": "Change password",
  "/admin/users": "Users",
  "/admin/users/new": "Create user",
  "/admin/currencies": "Currencies",
  "/admin/exchange-rates": "Exchange Rates",
  "/admin/rate-cards": "Rate Cards",
  "/admin/countries": "Countries",
  "/admin/resource-role-types": "Resource Role Types",
  "/admin/roles": "Roles",
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

/** One crumb in a breadcrumb trail. `href` is omitted for the current (last) page, which renders as plain text instead of a link. */
export interface BreadcrumbCrumb {
  label: string;
  href?: string;
}

const HOME_CRUMB: BreadcrumbCrumb = { label: "Dashboard", href: "/home" };

function crumb(label: string, href?: string): BreadcrumbCrumb {
  return href ? { label, href } : { label };
}

/**
 * Full breadcrumb trail (ancestors + current page) for every implemented
 * route, e.g. `/projects/new` -> `Dashboard / Projects / New project`. Unlike
 * `getBreadcrumbLabel` (which only resolves the *current* page's label, used
 * by `Topbar` prior to this trail existing), this also resolves each nested
 * route's parent list page so multi-level routes render their full path
 * instead of jumping straight from "Dashboard" to the leaf page.
 */
const STATIC_BREADCRUMB_TRAILS: Record<string, BreadcrumbCrumb[]> = {
  "/home": [HOME_CRUMB],
  "/profile": [HOME_CRUMB, crumb("Profile")],
  "/profile/change-password": [HOME_CRUMB, crumb("Profile", "/profile"), crumb("Change password")],
  "/admin/users": [HOME_CRUMB, crumb("Users")],
  "/admin/users/new": [HOME_CRUMB, crumb("Users", "/admin/users"), crumb("Create user")],
  "/admin/currencies": [HOME_CRUMB, crumb("Currencies")],
  "/admin/exchange-rates": [HOME_CRUMB, crumb("Exchange Rates")],
  "/admin/rate-cards": [HOME_CRUMB, crumb("Rate Cards")],
  "/admin/countries": [HOME_CRUMB, crumb("Countries")],
  "/admin/resource-role-types": [HOME_CRUMB, crumb("Resource Role Types")],
  "/admin/roles": [HOME_CRUMB, crumb("Roles")],
  "/projects": [HOME_CRUMB, crumb("Projects")],
  "/projects/new": [HOME_CRUMB, crumb("Projects", "/projects"), crumb("New project")],
  "/timesheet-periods": [HOME_CRUMB, crumb("Timesheet Periods")],
  "/timesheet-periods/new": [
    HOME_CRUMB,
    crumb("Timesheet Periods", "/timesheet-periods"),
    crumb("New timesheet period"),
  ],
  "/timesheets": [HOME_CRUMB, crumb("My Timesheets")],
  "/timesheets/history": [HOME_CRUMB, crumb("Timesheet History")],
  "/reports": [HOME_CRUMB, crumb("Reports")],
  "/reports/timesheet": [HOME_CRUMB, crumb("Reports", "/reports"), crumb("Timesheet Report")],
  "/reports/roles-summary": [HOME_CRUMB, crumb("Reports", "/reports"), crumb("User Roles Summary")],
  "/reports/cost-revenue": [HOME_CRUMB, crumb("Reports", "/reports"), crumb("Cost & Revenue Report")],
  "/invoices": [HOME_CRUMB, crumb("Invoices")],
  "/invoices/generate": [HOME_CRUMB, crumb("Invoices", "/invoices"), crumb("Generate Invoice")],
};

/** Resolves the full breadcrumb trail for `pathname`, falling back to just `Dashboard` for unknown routes. */
export function getBreadcrumbTrail(pathname: string): BreadcrumbCrumb[] {
  if (STATIC_BREADCRUMB_TRAILS[pathname]) return STATIC_BREADCRUMB_TRAILS[pathname];
  if (PROJECT_ASSIGNMENTS_ROUTE_PATTERN.test(pathname)) {
    return [HOME_CRUMB, crumb("Projects", "/projects"), crumb("Project assignments")];
  }
  if (PROJECT_EDIT_ROUTE_PATTERN.test(pathname)) {
    return [HOME_CRUMB, crumb("Projects", "/projects"), crumb("Edit project")];
  }
  if (INVOICE_DETAIL_ROUTE_PATTERN.test(pathname)) {
    return [HOME_CRUMB, crumb("Invoices", "/invoices"), crumb("Invoice detail")];
  }
  return [HOME_CRUMB];
}
