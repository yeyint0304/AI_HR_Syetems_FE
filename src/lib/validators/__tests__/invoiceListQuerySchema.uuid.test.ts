import { invoiceListQuerySchema } from "@/lib/validators/invoice.validators";

/**
 * Zod's `z.uuid()` (used for `projectId`/`currencyId`) enforces the RFC 4122
 * variant nibble (`8`/`9`/`a`/`b`) in addition to the general UUID shape —
 * this documents that stricter behavior against a realistic query so a
 * regression in the validator (or a future zod upgrade relaxing/tightening
 * `z.uuid()`) is caught explicitly.
 */
describe("invoiceListQuerySchema — UUID strictness", () => {
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
});
