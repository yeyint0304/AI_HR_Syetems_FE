/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see the same
 * rationale as `app/api/projects/[id]/__tests__/route.test.ts`.
 */
import { DELETE, GET, PUT } from "@/app/api/invoices/[id]/route";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";

jest.mock("@/lib/server/backendApiClient", () => ({
  backendApiClient: { get: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/lib/server/authCookies", () => ({
  getAccessToken: jest.fn(),
}));

jest.mock("@/lib/utils/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function base64Url(value: string): string {
  return Buffer.from(value, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildToken(claims: Record<string, unknown>): string {
  return [base64Url(JSON.stringify({ alg: "none", typ: "JWT" })), base64Url(JSON.stringify(claims)), "sig"].join(
    "."
  );
}

const systemAdminToken = buildToken({
  sub: "user-1",
  email: "admin@hrsystem.com",
  role: "SystemAdmin",
});
const userToken = buildToken({ sub: "user-2", email: "user@hrsystem.com", role: "User" });

const invoiceId = "855dc735-dada-4ee9-9eea-2b89b1b1b2b2";

describe("GET /api/invoices/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await GET(new Request(`http://localhost/api/invoices/${invoiceId}`), routeParams(invoiceId));

    expect(response.status).toBe(401);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("403s when the caller's role may not view invoices", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);

    const response = await GET(new Request(`http://localhost/api/invoices/${invoiceId}`), routeParams(invoiceId));

    expect(response.status).toBe(403);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("returns the invoice detail, including line items, unwrapping the backend's Data envelope", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: {
          Id: invoiceId,
          InvoiceNumber: "INV-2025-0001",
          Project: { Id: "6f2594d9-224a-414a-a409-30dc98f9a1be", Code: "PRJ-001", Name: "Project Helix" },
          ClientName: "TM",
          ClientEmail: "billing@tm.com",
          BillingPeriodStart: "2025-03-01",
          BillingPeriodEnd: "2025-03-31",
          Currency: { Id: "33333333-3333-3333-3333-333333333302", Code: "USD", Symbol: "$" },
          ExchangeRate: 1,
          SubTotal: 1800,
          TaxAmount: 0,
          TotalAmount: 1800,
          Status: "Draft",
          IssuedDate: "2025-04-01",
          DueDate: "2025-04-10",
          Notes: "Invoice for March services",
          LineItems: [
            {
              Id: "05955f7a-2b10-4140-8842-84fbf9cf3167",
              User: { Id: "f7c326c1-00b9-4aee-90c3-0000d06b37cc", FullName: "Lin Thit Htoo", EmployeeId: "EMP003" },
              ResourceRoleType: { Id: "44444444-4444-4444-4444-444444444401", Name: "Senior Developer" },
              TimesheetEntryId: "9b980603-cbca-440a-9bbd-ab371a956d01",
              Description: "Worked on feature implementation",
              Hours: 2,
              UnitRate: 75,
              Amount: 150,
            },
          ],
          CreatedAt: "2026-06-22T12:22:44Z",
        },
      },
    });

    const response = await GET(new Request(`http://localhost/api/invoices/${invoiceId}`), routeParams(invoiceId));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.invoiceNumber).toBe("INV-2025-0001");
    expect(body.data.lineItems).toHaveLength(1);
    expect(body.data.lineItems[0]).toEqual(expect.objectContaining({ hours: 2, amount: 150 }));
  });

  it("returns a 404 when the backend signals a logical failure (IsSuccess: false) at HTTP 200", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 404, IsSuccess: false, Message: "Invoice not found.", Data: null },
    });

    const response = await GET(new Request(`http://localhost/api/invoices/missing`), routeParams("missing"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.message).toBe("Invoice not found.");
  });
});

describe("PUT /api/invoices/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await PUT(
      new Request(`http://localhost/api/invoices/${invoiceId}`, { method: "PUT", body: JSON.stringify({}) }),
      routeParams(invoiceId)
    );

    expect(response.status).toBe(401);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("403s when the caller's role may not update invoices", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);

    const response = await PUT(
      new Request(`http://localhost/api/invoices/${invoiceId}`, { method: "PUT", body: JSON.stringify({}) }),
      routeParams(invoiceId)
    );

    expect(response.status).toBe(403);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("updates the invoice and returns 200 on success", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: {
          Id: invoiceId,
          InvoiceNumber: "INV-2025-0001",
          ClientName: "TM",
          ClientEmail: "billing@tm.com",
          IssuedDate: "2025-04-01",
          DueDate: "2025-04-10",
          Notes: "Invoice for March services",
          Status: "Draft",
        },
      },
    });

    const response = await PUT(
      new Request(`http://localhost/api/invoices/${invoiceId}`, {
        method: "PUT",
        body: JSON.stringify({ clientName: "TM" }),
      }),
      routeParams(invoiceId)
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(expect.objectContaining({ id: invoiceId, status: "Draft" }));
  });

  it("forwards the backend's message when only Draft invoices may be updated", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 409,
        IsSuccess: false,
        Message: "Only Draft invoices can be updated.",
        Data: null,
      },
    });

    const response = await PUT(
      new Request(`http://localhost/api/invoices/${invoiceId}`, {
        method: "PUT",
        body: JSON.stringify({ clientName: "TM" }),
      }),
      routeParams(invoiceId)
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.message).toBe("Only Draft invoices can be updated.");
  });
});

describe("DELETE /api/invoices/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("403s when the caller's role may not delete invoices", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);

    const response = await DELETE(new Request(`http://localhost/api/invoices/${invoiceId}`), routeParams(invoiceId));

    expect(response.status).toBe(403);
    expect(backendApiClient.delete).not.toHaveBeenCalled();
  });

  it("deletes the invoice and returns 204 on success", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.delete as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 200, IsSuccess: true, Message: "Invoice deleted.", Data: null },
    });

    const response = await DELETE(new Request(`http://localhost/api/invoices/${invoiceId}`), routeParams(invoiceId));

    expect(response.status).toBe(204);
  });

  it("forwards the backend's message when only Draft invoices may be deleted", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.delete as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 409, IsSuccess: false, Message: "Only Draft invoices can be deleted.", Data: null },
    });

    const response = await DELETE(new Request(`http://localhost/api/invoices/${invoiceId}`), routeParams(invoiceId));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.message).toBe("Only Draft invoices can be deleted.");
  });
});
