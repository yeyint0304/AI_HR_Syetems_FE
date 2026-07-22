__Technical Requirements for HR System — Next\.js Frontend__

# Tech Stack

•  __Frontend: __Next\.js 14\+ \(App Router\)

•  __Language: __TypeScript \(strict mode\)

•  __Styling: __Tailwind CSS

•  __Component Library: __shadcn/ui \(Radix UI primitives\)

•  __State Management: __Zustand \(global\), React Query / TanStack Query \(server state & caching\)

•  __Forms: __React Hook Form \+ Zod \(client\-side validation\)

•  __HTTP Client: __Axios \(centralised instance with interceptors\) or native fetch via TanStack Query

•  __Authentication: __JWT — stored in httpOnly cookies; handled via Next\.js middleware

•  __Backend: __\.NET Core \(unchanged\)

•  __Database: __MySQL \(unchanged\)

# Infrastructure & Deployment

## Backend \(unchanged — for reference\)

•  Docker

•  MySQL image: 8\.0

•  MySQL container name: mysql

•  MYSQL\_DATABASE: HR\_System

•  Volume: mysql\_data:/var/lib/mysql

•  MySQL Ports: 3306:3306

•  Bridge network: backend

•  API service name: hrsystembackend

•  API container name: hrsystembackend

•  API Ports: 5093:80

•  API depends on: mysql

•  API Environment: ASPNETCORE\_ENVIRONMENT — Development \(local\) / UAT \(user testing\)

•  Restart policy: unless\-stopped

## Frontend

•  Docker

•  Next\.js service name: hrsystemfrontend

•  Next\.js container name: hrsystemfrontend

•  Base image: node:20\-alpine \(build stage\) → node:20\-alpine \(runtime\)

•  Ports: 3000:3000

•  Network: backend \(same bridge as API so service\-name resolution works\)

•  Environment: NEXT\_PUBLIC\_API\_URL — set per environment via Docker / \.env

•  Restart policy: unless\-stopped

•  Build: npm run build → npm run start \(production server\)

# Software Architecture

•  __App Router: __Next\.js 14 App Router — all routes under /app directory

•  __Rendering strategy: __Server Components by default; Client Components \('use client'\) only where interactivity or browser APIs are required

•  __Route grouping: __Route groups with \(group\) folders to share layouts without affecting URL segments

•  __API layer: __All backend calls go through a centralised /lib/api/ module — no direct fetch calls scattered across components

•  __Layouts: __Shared layouts per route group — root layout, auth layout, dashboard layout

•  __Separation of concerns:__

•  UI layer — components/ and app/ \(rendering only\)

•  Data\-fetching layer — lib/api/ \(Axios instance, query functions\)

•  State layer — stores/ \(Zustand slices\)

•  Validation layer — lib/validators/ \(Zod schemas shared with forms\)

•  Utility layer — lib/utils/ \(formatters, helpers\)

# Design Patterns

•  __Container / Presentational: __Smart containers \(data\-fetching, state\) pass props to dumb presentational components

•  __Custom Hooks: __Extract reusable stateful logic into /hooks — e\.g\. useAuth, usePagination, useDebounce

•  __Repository Pattern \(frontend\): __All API calls encapsulated in /lib/api/\*\.ts modules — components never call fetch/axios directly

•  __Compound Component Pattern: __Complex UI \(modals, dropdowns, tabs\) built as compound components for composability

•  __Optimistic Updates: __Via TanStack Query's onMutate \+ rollback for immediate UI feedback

•  __Error Boundary Pattern: __React error boundaries at route segment level to isolate failures

# Project Structure

HR\_System\_FE/

├── \.github/workflows/          CI/CD pipelines

├── public/                     Static assets

├── src/

│   ├── app/                    App Router root

│   │   ├── layout\.tsx          Root layout \(fonts, providers\)

│   │   ├── globals\.css

│   │   ├── \(auth\)/             Auth route group

│   │   │   ├── layout\.tsx

│   │   │   ├── login/

│   │   │   │   └── page\.tsx

│   │   │   └── register/

│   │   │       └── page\.tsx

│   │   └── \(dashboard\)/        Protected route group

│   │       ├── layout\.tsx

│   │       ├── projects/

│   │       │   ├── page\.tsx

│   │       │   └── \[id\]/

│   │       │       └── page\.tsx

│   │       ├── timesheets/

│   │       ├── invoices/

│   │       ├── reports/

│   │       └── settings/

│   ├── components/             Shared reusable UI components

│   │   ├── ui/                 shadcn/ui primitives

│   │   ├── layout/             Header, Sidebar, Footer, PageWrapper

│   │   ├── forms/              Reusable form components

│   │   ├── tables/             DataTable, Pagination, Filters

│   │   └── common/             Loaders, Badges, EmptyState, ErrorState

│   ├── hooks/                  Custom React hooks

│   │   ├── useAuth\.ts

│   │   ├── usePagination\.ts

│   │   └── useDebounce\.ts

│   ├── lib/                    Core library layer

│   │   ├── api/                API modules \(one file per domain\)

│   │   │   ├── axios\.ts        Centralised Axios instance \+ interceptors

│   │   │   ├── auth\.api\.ts

│   │   │   ├── projects\.api\.ts

│   │   │   ├── timesheets\.api\.ts

│   │   │   ├── invoices\.api\.ts

│   │   │   └── reports\.api\.ts

│   │   ├── validators/         Zod schemas \(mirrors backend DTOs\)

│   │   └── utils/              Formatters, date helpers, constants

│   ├── stores/                 Zustand global state slices

│   │   ├── auth\.store\.ts

│   │   └── ui\.store\.ts         Sidebar state, theme, toasts

│   ├── types/                  TypeScript interfaces & enums

│   │   ├── api\.types\.ts        Shared API response/request types

│   │   └── domain\.types\.ts     Domain model types

│   └── middleware\.ts           Next\.js middleware — JWT route protection

├── \_\_tests\_\_/                  Test files \(mirrors src/ structure\)

│   ├── components/

│   ├── hooks/

│   └── lib/api/

├── \.env\.local                  Local env vars \(gitignored\)

├── \.env\.example                Env var template \(committed\)

├── next\.config\.ts

├── tailwind\.config\.ts

├── tsconfig\.json               strict: true

├── jest\.config\.ts

└── docker\-compose\.yml

# Environment Configurations

•  __\.env\.local__ — local development \(gitignored\)

•  __\.env\.example__ — template with all required keys, no values \(committed\)

•  __\.env\.uat__ — injected via Docker / CI secrets \(not committed\)

•  __\.env\.production__ — injected via Docker / CI secrets \(not committed\)

•  Client\-exposed variables must be prefixed NEXT\_PUBLIC\_

•  Server\-only variables \(e\.g\. internal service URLs, secrets\) must have NO NEXT\_PUBLIC\_ prefix

•  Never commit real values — \.env\.local is gitignored; CI/CD injects real values at build time

•  Required variables:

NEXT\_PUBLIC\_API\_URL=http://localhost:5093/api/v1

NEXT\_PUBLIC\_APP\_ENV=development

JWT\_SECRET=<server\-only\-not\-exposed\-to\-client>

# Logging

•  __Client\-side errors: __Custom error boundary captures render errors and reports to console in dev / external logger in production

•  __API errors: __Axios response interceptor catches all non\-2xx responses, logs context \(endpoint, status, correlation ID\) and surfaces a user\-friendly toast

•  __Console discipline: __No console\.log in production code — ESLint rule no\-console enforced; use a structured logger utility \(lib/utils/logger\.ts\) that is a no\-op in production builds

•  __Server\-side \(App Router\): __next\.config\.ts logging config captures server component and API route errors; forwarded to stdout for Docker log collection

# Security Standards

## Authentication & Session

•  JWT stored in httpOnly, Secure, SameSite=Strict cookies — never localStorage

•  Token refresh handled transparently via Axios interceptor

•  Next\.js middleware\.ts enforces route protection — unauthenticated requests redirected to /login

•  Session expiry: automatic redirect to /login with returnUrl preserved

## Input & Output

•  All user input validated with Zod on the client before submission

•  Never use dangerouslySetInnerHTML — if unavoidable, sanitise with DOMPurify first

•  Never construct URLs or query parameters from unvalidated user input

## Environment & Secrets

•  No secrets in NEXT\_PUBLIC\_ variables — they are embedded in the client bundle

•  API keys, internal URLs, and credentials in server\-only env vars

•  \.env\.local gitignored; CI injects real values at build time

## HTTP Headers

•  Content\-Security\-Policy configured in next\.config\.ts headers\(\)

•  X\-Frame\-Options: DENY

•  X\-Content\-Type\-Options: nosniff

•  Referrer\-Policy: strict\-origin\-when\-cross\-origin

## Dependencies

•  npm audit run in CI pipeline — HIGH/CRITICAL findings block merge

•  Dependabot or Renovate configured for automated dependency updates

# Coding Standards

## TypeScript

•  strict: true in tsconfig\.json — no implicit any, no type assertions without justification

•  Prefer interfaces for object shapes, type for unions/intersections

•  Explicit return types on all exported functions

•  Domain types in /types — never use any or unknown without a guard

## Components

•  Server Components by default — add 'use client' only when needed \(event handlers, hooks, browser APIs\)

•  One component per file; filename matches component name in PascalCase

•  Props interfaces defined above the component; exported if reused

•  No inline styles — Tailwind utility classes only

•  Accessible by default: semantic HTML, aria\-\* attributes, keyboard navigation

•  Handle all states explicitly: loading, error, empty, success

## Naming Conventions

•  Components: PascalCase \(UserProfileCard\.tsx\)

•  Hooks: camelCase prefixed with use \(useAuth\.ts\)

•  Utilities / helpers: camelCase \(formatCurrency\.ts\)

•  API modules: camelCase with \.api\.ts suffix \(projects\.api\.ts\)

•  Zustand stores: camelCase with \.store\.ts suffix \(auth\.store\.ts\)

•  Zod schemas: camelCase with Schema suffix \(loginFormSchema\)

•  Types/Interfaces: PascalCase; interfaces prefixed with I only if needed for disambiguation

•  Constants: SCREAMING\_SNAKE\_CASE

## API Integration

•  All backend calls go through /lib/api/ — no fetch/axios calls directly in components or hooks

•  Centralised Axios instance in lib/api/axios\.ts with base URL, auth header injection, and error interceptors

•  TanStack Query \(useQuery, useMutation\) for all server state — no manual loading/error state management

•  Query keys follow a hierarchical tuple pattern: \['projects'\], \['projects', id\], \['projects', id, 'timesheets'\]

•  Optimistic updates via onMutate \+ rollback for create/update/delete mutations

## Forms

•  React Hook Form for all form state management

•  Zod schema defined first; passed to useForm via zodResolver

•  Never access form values outside the RHF context

•  Field\-level error messages displayed inline, aria\-describedby linked to field

## File & Folder

•  Feature code co\-located in app/ route folder when it is route\-specific

•  Shared/reusable code in components/, hooks/, lib/ — never duplicated

•  No barrel index\.ts files unless the folder has 5\+ exports \(they slow Fast Refresh\)

•  Do not touch unrelated modules when implementing a feature

## Performance

•  Use next/image for all images — never <img>

•  Use next/link for all internal navigation — never <a href>

•  Dynamic import \(next/dynamic\) for large components not needed on initial render

•  useMemo / useCallback only when a measured performance problem exists — not preemptively

•  Dependency arrays in useEffect / useMemo / useCallback must be complete

## Testing

•  Jest \+ React Testing Library for unit and component tests

•  Playwright for end\-to\-end tests \(critical user journeys\)

•  Test files in \_\_tests\_\_/ mirroring src/ structure, or co\-located as \*\.test\.tsx

•  Test naming: describe\('<ComponentName>'\) → it\('should <expected behaviour>'\)

•  Mock all API calls in tests — never hit real backend

•  Coverage threshold: 70% lines/branches on lib/ and hooks/; components tested for render \+ key interactions

## Linting & Formatting

•  ESLint with Next\.js recommended config \+ typescript\-eslint

•  Prettier for formatting — enforced in CI

•  Husky \+ lint\-staged: lint and format on pre\-commit

•  CI blocks merge on lint errors or TypeScript compilation errors

# RBAC \(Role\-Based Access Control — Frontend\)

•  Roles decoded from JWT claims on the server in middleware\.ts

•  Route\-level protection: middleware redirects unauthorised roles

•  Component\-level: useAuth hook exposes user role; conditional rendering hides actions the user cannot perform

•  Never rely solely on client\-side hiding — backend enforces authorisation; frontend mirrors it for UX only

•  Roles: SystemAdmin, ProjectAdmin, User, Guest — same as backend RBAC definition

# Database Standards \(Backend — unchanged reference\)

•  Primary Keys: GUID

•  Soft Delete: IsDeleted

•  Use and follow Flyway versioning

•  Follow PascalCase for table names and column names

