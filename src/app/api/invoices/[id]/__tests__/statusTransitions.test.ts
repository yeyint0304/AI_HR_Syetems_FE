/**
 * @jest-environment node
 *
 * Covers the four thin status-transition Route Handlers (`send`, `mark-paid`,
 * `void`, `cancel`), each of which delegates to
 * `lib/server/invoiceStatusTransition.ts#handleInvoiceStatusTransition`.
 */
import { PUT as sendInvoice } from "@/app/api/invoices/[id]/send/route";
import { PUT as markInvoicePaid } from "@/app/api/invoices/[id]/mark-paid/route";
import { PUT as voidInvoice } from "@/app/api/invoices/[id]/void/route";
import { PUT as cancelInvoice } from "@/app/api/invoices/[id]/cancel/route";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";

jest.mock("@/lib/server/backendApiClient", () => ({
  backendApiClient: { put: jest.fn() },
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

const systemAdminToken = buildToken({ sub: "user-1", email: "admin@hrsystem.com", role: "SystemAdmin" });
const userToken = buildToken({ sub: "user-2", email: "user@hrsystem.com", role: "User" });

const invoiceId = "855dc735-dada-4ee9-9eea-2b89b1b1b2b2";

const transitions: {
  name: string;
  handler: typeof sendInvoice;
  backendPath: string;
  resultStatus: string;
}[] = [
  { name: "send", handler: sendInvoice, backendPath: "/Invoice/SendInvoice", resultStatus: "Sent" },
  { name: "mark-paid", handler: markInvoicePaid, backendPath: "/Invoice/MarkInvoicePaid", resultStatus: "Paid" },
  { name: "void", handler: voidInvoice, backendPath: "/Invoice/VoidInvoice", resultStatus: "Void" },
  { name: "cancel", handler: cancelInvoice, backendPath: "/Invoice/CancelInvoice", resultStatus: "Cancelled" },
];

describe.each(transitions)("PUT /api/invoices/[id]/$name", ({ handler, backendPath, resultStatus }) => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await handler(new Request(`http://localhost/api/invoices/${invoiceId}`), routeParams(invoiceId));

    expect(response.status).toBe(401);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("403s when the caller's role may not manage invoices", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);

    const response = await handler(new Request(`http://localhost/api/invoices/${invoiceId}`), routeParams(invoiceId));

    expect(response.status).toBe(403);
    expect(backendApiClient.put).not.toHaveBeenCalled();
  });

  it("calls the correct backend endpoint with no request body and returns the new status", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 200, IsSuccess: true, Message: "Success", Data: { Id: invoiceId, Status: resultStatus } },
    });

    const response = await handler(new Request(`http://localhost/api/invoices/${invoiceId}`), routeParams(invoiceId));
    const body = await response.json();

    expect(backendApiClient.put).toHaveBeenCalledWith(
      `${backendPath}/${invoiceId}`,
      null,
      expect.objectContaining({ headers: { Authorization: `Bearer ${systemAdminToken}` } })
    );
    expect(response.status).toBe(200);
    expect(body.data).toEqual({ id: invoiceId, status: resultStatus });
  });

  it("forwards the backend's message for an expected 4xx logical failure", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.put as jest.Mock).mockResolvedValueOnce({
      data: { StatusCode: 409, IsSuccess: false, Message: "Invalid status transition.", Data: null },
    });

    const response = await handler(new Request(`http://localhost/api/invoices/${invoiceId}`), routeParams(invoiceId));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.message).toBe("Invalid status transition.");
  });
});
