import { invoiceListQuerySchema } from "@/lib/validators/invoice.validators";

/**
 * Companion to `invoiceListQuerySchema.uuid.test.ts`.
 *
 * Previously documented `z.uuid()`'s stricter RFC 4122 variant-nibble
 * rejection of this exact seeded Currency id as "intentional for now" — that
 * was the root cause of the `bugs/roles` invoice-filtering 400
 * ("Invalid filter parameters.") regression. `projectId`/`currencyId` now use
 * the shared lenient `guidSchema` (see `lib/validators/shared.validators.ts`),
 * so this seeded id is accepted, matching the .NET backend's own (lenient)
 * GUID parsing.
 */
describe("invoiceListQuerySchema — accepts a non-RFC-4122 variant GUID", () => {
  it("accepts a currencyId whose variant nibble is not 8/9/a/b", () => {
    const result = invoiceListQuerySchema.safeParse({
      currencyId: "33333333-3333-3333-3333-333333333301",
    });
    expect(result.success).toBe(true);
  });
});
