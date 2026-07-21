import { invoiceListQuerySchema } from "@/lib/validators/invoice.validators";

/**
 * `projectId`/`currencyId` use the shared lenient `guidSchema` (see
 * `lib/validators/shared.validators.ts`), not zod's stricter `z.uuid()` —
 * this documents that the backend's seeded, non-RFC-4122-variant-compliant
 * Currency ids (`docs/HR_System_BE.postman_collection.json`, e.g.
 * `33333333-3333-3333-3333-333333333301`) are accepted, alongside standard
 * RFC 4122 GUIDs, so a regression (e.g. reverting to `z.uuid()`) is caught
 * explicitly. This was previously a 400 ("Invalid filter parameters.") bug —
 * see `bugs/roles` — the same class already fixed for
 * `createUserSchema.roleId` and `timesheetEntryListQuerySchema`.
 */
describe("invoiceListQuerySchema — GUID leniency", () => {
  it("accepts a fully populated, valid query using RFC 4122-compliant GUIDs", () => {
    const result = invoiceListQuerySchema.safeParse({
      projectId: "6f2594d9-224a-414a-a409-30dc98f9a1be",
      status: "Draft",
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      currencyId: "33333333-3333-4333-a333-333333333301",
      page: "1",
      pageSize: "20",
    });
    expect(result.success).toBe(true);
  });

  it("accepts the backend's seeded, non-RFC-4122-variant Currency id", () => {
    const result = invoiceListQuerySchema.safeParse({
      currencyId: "33333333-3333-3333-3333-333333333301",
    });
    expect(result.success).toBe(true);
  });
});
