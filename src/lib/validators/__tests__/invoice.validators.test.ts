import {
  generateInvoiceSchema,
  invoiceListQuerySchema,
  updateInvoiceSchema,
} from "@/lib/validators/invoice.validators";

describe("invoice.validators", () => {
  describe("generateInvoiceSchema", () => {
    const validPayload = {
      projectId: "6f2594d9-224a-414a-a409-30dc98f9a1be",
      billingPeriodStart: "2025-03-01",
      billingPeriodEnd: "2025-03-31",
      currencyId: "33333333-3333-3333-3333-333333333301",
      clientName: "Acme Corp",
      clientEmail: "billing@acme.com",
      issuedDate: "2025-04-01",
      dueDate: "2025-04-10",
      notes: "Invoice for March services",
    };

    it("accepts a fully populated, valid payload", () => {
      expect(generateInvoiceSchema.safeParse(validPayload).success).toBe(true);
    });

    it("accepts a payload with only the required fields (Client email and Notes omitted)", () => {
      const result = generateInvoiceSchema.safeParse({
        projectId: validPayload.projectId,
        billingPeriodStart: validPayload.billingPeriodStart,
        billingPeriodEnd: validPayload.billingPeriodEnd,
        currencyId: validPayload.currencyId,
        clientName: validPayload.clientName,
        issuedDate: validPayload.issuedDate,
        dueDate: validPayload.dueDate,
      });
      expect(result.success).toBe(true);
    });

    it("rejects a missing project", () => {
      const result = generateInvoiceSchema.safeParse({ ...validPayload, projectId: "" });
      expect(result.success).toBe(false);
    });

    it("rejects a missing client name", () => {
      const result = generateInvoiceSchema.safeParse({ ...validPayload, clientName: "" });
      expect(result.success).toBe(false);
    });

    it("rejects a missing issued date", () => {
      const result = generateInvoiceSchema.safeParse({ ...validPayload, issuedDate: "" });
      expect(result.success).toBe(false);
    });

    it("rejects a missing due date", () => {
      const result = generateInvoiceSchema.safeParse({ ...validPayload, dueDate: "" });
      expect(result.success).toBe(false);
    });

    it("rejects an invalid client email", () => {
      const result = generateInvoiceSchema.safeParse({ ...validPayload, clientEmail: "not-an-email" });
      expect(result.success).toBe(false);
    });

    it("rejects a billing period end before the start", () => {
      const result = generateInvoiceSchema.safeParse({
        ...validPayload,
        billingPeriodStart: "2025-03-31",
        billingPeriodEnd: "2025-03-01",
      });
      expect(result.success).toBe(false);
    });

    it("rejects a due date before the issued date", () => {
      const result = generateInvoiceSchema.safeParse({
        ...validPayload,
        issuedDate: "2025-04-10",
        dueDate: "2025-04-01",
      });
      expect(result.success).toBe(false);
    });

    it("rejects a malformed date (not YYYY-MM-DD)", () => {
      const result = generateInvoiceSchema.safeParse({
        ...validPayload,
        billingPeriodStart: "03/01/2025",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateInvoiceSchema", () => {
    it("accepts an empty object (every field optional)", () => {
      expect(updateInvoiceSchema.safeParse({}).success).toBe(true);
    });

    it("accepts a partial update", () => {
      const result = updateInvoiceSchema.safeParse({ clientName: "New Client Name" });
      expect(result.success).toBe(true);
    });

    it("rejects a due date before the issued date", () => {
      const result = updateInvoiceSchema.safeParse({
        issuedDate: "2025-04-10",
        dueDate: "2025-04-01",
      });
      expect(result.success).toBe(false);
    });

    it("rejects an invalid client email", () => {
      const result = updateInvoiceSchema.safeParse({ clientEmail: "not-an-email" });
      expect(result.success).toBe(false);
    });
  });

  describe("invoiceListQuerySchema", () => {
    it("accepts an empty query (every field optional)", () => {
      expect(invoiceListQuerySchema.safeParse({}).success).toBe(true);
    });

    it("accepts a fully populated, valid query", () => {
      const result = invoiceListQuerySchema.safeParse({
        projectId: "6f2594d9-224a-414a-a409-30dc98f9a1be",
        status: "Draft",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        // Uses an RFC 4122-compliant GUID (variant nibble 8/9/a/b) — unlike
        // the mock currency IDs in `docs/HR_System_BE.postman_collection.json`
        // (e.g. `33333333-3333-3333-3333-333333333301`), zod's `z.uuid()`
        // enforces that constraint; see `invoiceListQuerySchema.uuid.test.ts`.
        currencyId: "33333333-3333-4333-a333-333333333301",
        page: "1",
        pageSize: "20",
      });
      expect(result.success).toBe(true);
    });

    it("rejects an invalid status value", () => {
      const result = invoiceListQuerySchema.safeParse({ status: "NotAStatus" });
      expect(result.success).toBe(false);
    });

    it("rejects a non-GUID projectId", () => {
      const result = invoiceListQuerySchema.safeParse({ projectId: "not-a-guid" });
      expect(result.success).toBe(false);
    });
  });
});
