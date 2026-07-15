This is the **AI HR System** frontend — a [Next.js](https://nextjs.org) (App Router) application bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app), using TypeScript (strict mode) and Tailwind CSS.

## Getting Started

First, run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. You'll be redirected to `/login`.

**Demo login (local mock data, no backend required yet):** username `admin`, password `Password@123` (see `src/lib/mockUsers.ts` for the other seeded demo accounts and roles).

> Note: Authentication and data (users/projects) currently run against an in-memory/`localStorage` mock (`src/lib/mockUsers.ts`, `src/lib/mockProjects.ts`) so the UI can be developed and demoed before the real backend (see `docs/HR_System_BE.postman_collection.json`) is wired up. This is a temporary scaffold, not a security boundary — do not treat it as production auth.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Project structure

```
src/
  app/
    login/            Public login route
    (dashboard)/       Authenticated app shell (redirects to /login if not signed in)
      page.tsx          Dashboard home
      profile/          Update profile / change password
      projects/         Project list, create, edit, assignments
      users/new/        Create user
  components/          Shared, reusable UI (Sidebar, Breadcrumbs, UserMenu, ConfirmModal, ToastProvider, icons)
  lib/                 Mock data access + helpers (breadcrumbs, mockUsers, mockProjects)
  store/               Zustand auth store + client-side hydration helper
  types/               Shared TypeScript types (auth, project)
```

## Available scripts

- `npm run dev` — start the local dev server
- `npm run build` — production build (runs the TypeScript compiler as part of the build)
- `npm run start` — serve the production build
- `npm run lint` — run ESLint

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
