/**
 * @jest-environment node
 */
import { GET } from "@/app/api/invoices/[id]/pdf/route";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";

jest.mock("@/lib/server/backendApiClient", () => ({
  backendApiClient: { get: jest.fn() },
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

describe("GET /api/invoices/[id]/pdf", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401s when there is no access-token cookie", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    const response = await GET(new Request(`http://localhost/api/invoices/${invoiceId}/pdf`), routeParams(invoiceId));

    expect(response.status).toBe(401);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("403s when the caller's role may not manage invoices", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(userToken);

    const response = await GET(new Request(`http://localhost/api/invoices/${invoiceId}/pdf`), routeParams(invoiceId));

    expect(response.status).toBe(403);
    expect(backendApiClient.get).not.toHaveBeenCalled();
  });

  it("streams the backend's PDF bytes back with the correct headers", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    const pdfBytes = new TextEncoder().encode("%PDF-1.4 fake pdf content").buffer;
    (backendApiClient.get as jest.Mock).mockResolvedValueOnce({ data: pdfBytes });

    const response = await GET(new Request(`http://localhost/api/invoices/${invoiceId}/pdf`), routeParams(invoiceId));

    expect(backendApiClient.get).toHaveBeenCalledWith(
      `/Invoice/GetInvoicePdf/${invoiceId}`,
      expect.objectContaining({
        headers: { Authorization: `Bearer ${systemAdminToken}` },
        responseType: "arraybuffer",
      })
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toBe(`attachment; filename="invoice-${invoiceId}.pdf"`);
  });

  it("returns a 404 message when the backend reports the PDF isn't found", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404 },
    });

    const response = await GET(new Request(`http://localhost/api/invoices/${invoiceId}/pdf`), routeParams(invoiceId));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.message).toMatch(/invoice pdf not found/i);
  });

  it("returns a 502 for an unexpected backend failure", async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(systemAdminToken);
    (backendApiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500 },
    });

    const response = await GET(new Request(`http://localhost/api/invoices/${invoiceId}/pdf`), routeParams(invoiceId));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.message).toMatch(/unable to download the invoice pdf/i);
  });
});
