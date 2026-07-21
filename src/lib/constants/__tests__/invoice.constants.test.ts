import { canManageInvoices, INVOICE_STATUSES } from "@/lib/constants/invoice.constants";

describe("invoice.constants", () => {
  describe("canManageInvoices", () => {
    it("allows SystemAdmin", () => {
      expect(canManageInvoices("SystemAdmin")).toBe(true);
    });

    it("allows ProjectAdmin", () => {
      expect(canManageInvoices("ProjectAdmin")).toBe(true);
    });

    it("disallows a plain User", () => {
      expect(canManageInvoices("User")).toBe(false);
    });

    it("disallows Guest", () => {
      expect(canManageInvoices("Guest")).toBe(false);
    });

    it("disallows a null/undefined role", () => {
      expect(canManageInvoices(null)).toBe(false);
      expect(canManageInvoices(undefined)).toBe(false);
    });
  });

  it("documents every backend-supported invoice status", () => {
    expect(INVOICE_STATUSES).toEqual(["Draft", "Sent", "Paid", "Void", "Cancelled"]);
  });
});
