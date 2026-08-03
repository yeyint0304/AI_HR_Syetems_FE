/**
 * @jest-environment node
 *
 * Route Handlers run in the Node.js runtime, not jsdom — see the same
 * rationale as `app/api/projects/__tests__/route.test.ts`.
 */
import { GET, POST } from "@/app/api/invoices/route";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";

jest.mock("@/lib/server/backendApiClient", () => ({
  backendApiClient: { get: jest.fn(), post: jest.fn() },
}));

jest.mock("@/lib/server/authCookies", () => ({
  getAccessToken: jest.fn(),
}));

jest.mock("@/lib/utils/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

function base64Url(value: string): string {
  return Buffer.from(value, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Builds an unsigned JWT carrying the given claims (payload-decoding only — see `lib/utils/jwt.ts`). */
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

const projectAdminToken = buildToken({
  sub: "user-3",
  email: "projectadmin@d3-sg.com",
  role: "ProjectAdmin",
});

const validGeneratePayload = {
  projectId: "6f2594d9-224a-414a-a409-30dc98f9a1be",
  billingPeriodStart: "2025-03-01",
  billingPeriodEnd: "2025-03-31",
  currencyId: "33333333-3333-3333-3333-333333333302",
  clientName: "TM",
  clientEmail: "billing@tm.com",
  issuedDate: "2025-04-01",
  dueDate: "2025-04-10",
  notes: "Invoice for March services",
};

describe("GET /api/invoices", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await GET(new Request("http://localhost/api/invoices"));

    expect(response.status).toBe(401);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("403s when the caller's role may not manage invoices", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);

    const response = await GET(new Request("http://localhost/api/invoices"));

    expect(response.status).toBe(403);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("400s on invalid filter parameters", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);

    const response = await GET(new Request("http://localhost/api/invoices?status=NotAStatus"));

    expect(response.status).toBe(400);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("returns the paginated invoice list, unwrapping the backend's Data envelope", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: {
          Items: [
            {
              Id: "855dc735-dada-4ee9-9eea-2b89b1b1b2b2",
              InvoiceNumber: "INV-2025-0001",
              Project: { Id: "6f2594d9-224a-414a-a409-30dc98f9a1be", Code: "PRJ-001", Name: "Project Helix" },
              ClientName: "TM",
              BillingPeriodStart: "2025-03-01",
              BillingPeriodEnd: "2025-03-31",
              Currency: { Code: "USD", Symbol: "$" },
              TotalAmount: 1800,
              Status: "Draft",
              IssuedDate: "2025-04-01",
              DueDate: "2025-04-10",
            },
          ],
          TotalCount: 1,
          Page: 1,
          PageSize: 20,
        },
      },
    });

    const response = await GET(new Request("http://localhost/api/invoices"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.totalCount).toBe(1);
    expect(body.data.items[0]).toEqual(
      expect.objectContaining({ id: "855dc735-dada-4ee9-9eea-2b89b1b1b2b2", invoiceNumber: "INV-2025-0001" })
    );
  });

  it("returns a 502 fallback when the backend call itself fails", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: {} },
    });

    const response = await GET(new Request("http://localhost/api/invoices"));

    expect(response.status).toBe(502);
  });

  it("calls Invoice/GetAllInvoices for a SystemAdmin", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 200, IsSuccess: true, Message: "Success", Data: { Items: [], TotalCount: 0, Page: 1, PageSize: 20 } },
    });

    await GET(new Request("http://localhost/api/invoices"));

    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/Invoice/GetAllInvoices",
      expect.objectContaining({ headers: { Authorization: `Bearer ${systemAdminToken}` } })
    );
  });

  it("calls Invoice/GetMyInvoices for a ProjectAdmin", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(projectAdminToken);
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 200, IsSuccess: true, Message: "Success", Data: { Items: [], TotalCount: 0, Page: 1, PageSize: 20 } },
    });

    const response = await GET(new Request("http://localhost/api/invoices"));

    expect(response.status).toBe(200);
    expect(backendApiClient.get).toHaveBeenCalledWith(
      "/Invoice/GetMyInvoices",
      expect.objectContaining({ headers: { Authorization: `Bearer ${projectAdminToken}` } })
    );
  });
});

describe("POST /api/invoices", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await POST(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        body: JSON.stringify(validGeneratePayload),
      })
    );

    expect(response.status).toBe(401);
    expect(backendApiClient.post).not.toHaveBeenCalled();
  });

  it("403s when the caller's role may not generate invoices", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);

    const response = await POST(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        body: JSON.stringify(validGeneratePayload),
      })
    );

    expect(response.status).toBe(403);
    expect(backendApiClient.post).not.toHaveBeenCalled();
  });

  it("400s on an invalid request body", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);

    const response = await POST(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        body: JSON.stringify({ ...validGeneratePayload, clientName: "" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors).toBeDefined();
    expect(backendApiClient.post).not.toHaveBeenCalled();
  });

  it("generates the invoice and returns 201 on success", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 200,
        IsSuccess: true,
        Message: "Invoice generated successfully.",
        Data: {
          Id: "9601a785-ab76-452b-931f-efd2f99b4c44",
          InvoiceNumber: "INV-2025-0001",
          ProjectId: validGeneratePayload.projectId,
          ProjectName: "Project Helix",
          ClientName: "TM",
          BillingPeriodStart: "2025-03-01",
          BillingPeriodEnd: "2025-03-31",
          Currency: { Code: "SGD", Symbol: "S$" },
          ExchangeRate: 1,
          SubTotal: 1800,
          TaxAmount: 0,
          TotalAmount: 1800,
          Status: "Draft",
          LineItemCount: 7,
        },
      },
    });

    const response = await POST(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        body: JSON.stringify(validGeneratePayload),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toEqual(
      expect.objectContaining({ id: "9601a785-ab76-452b-931f-efd2f99b4c44", invoiceNumber: "INV-2025-0001" })
    );
  });

  it("forwards the backend's message for an expected 4xx logical failure", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        StatusCode: 400,
        IsSuccess: false,
        Message: "No approved timesheet entries found for this billing period.",
        Data: null,
      },
    });

    const response = await POST(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        body: JSON.stringify(validGeneratePayload),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe("No approved timesheet entries found for this billing period.");
  });
});
