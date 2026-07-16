export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-slate-950 px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-lg font-semibold text-white"
        >
          HR
        </span>
        <h1 className="text-xl font-semibold text-white">HR System</h1>
        <p className="text-sm text-slate-400">Timesheet, Invoice &amp; User Management</p>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
