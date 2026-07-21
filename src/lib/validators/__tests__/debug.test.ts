import { invoiceListQuerySchema } from "@/lib/validators/invoice.validators";

/**
 * Companion to `invoiceListQuerySchema.uuid.test.ts`: confirms a GUID that is
 * shaped correctly but violates the RFC 4122 variant-nibble constraint
 * (`z.uuid()`'s stricter check) is still rejected as invalid.
 */
describe("invoiceListQuerySchema — rejects a non-RFC-4122 variant GUID", () => {
  it("rejects a currencyId whose variant nibble is not 8/9/a/b", () => {
    const result = invoiceListQuerySchema.safeParse({
      currencyId: "33333333-3333-3333-3333-333333333301",
    });
    expect(result.success).toBe(false);
  });
});
