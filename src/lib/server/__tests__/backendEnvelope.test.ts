/**
 * @jest-environment node
 */
import { readBackendEnvelope, resolveEnvelopeFailure, toHttpStatus } from "@/lib/server/backendEnvelope";
import { logger } from "@/lib/utils/logger";

jest.mock("@/lib/utils/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

describe("readBackendEnvelope", () => {
  it("reads a successful single-object envelope (per the saved Auth/Login example)", () => {
    const envelope = readBackendEnvelope({
      StatusCode: 200,
      IsSuccess: true,
      Message: "Success",
      Data: {
        AccessToken: "access-token",
        RefreshToken: "refresh-token",
        UserId: "00000000-0000-0000-0000-000000000001",
        Username: "admin",
      },
    });

    expect(envelope.isSuccess).toBe(true);
    expect(envelope.statusCode).toBe(200);
    expect(envelope.message).toBe("Success");
    expect(envelope.data).toEqual(
      expect.objectContaining({ AccessToken: "access-token", RefreshToken: "refresh-token" })
    );
  });

  it("reads a successful list envelope (per the saved Project/GetProjectAssignments example)", () => {
    const envelope = readBackendEnvelope({
      StatusCode: 200,
      IsSuccess: true,
      Message: "Success",
      Data: [{ Id: "1" }, { Id: "2" }],
    });

    expect(envelope.isSuccess).toBe(true);
    expect(Array.isArray(envelope.data)).toBe(true);
  });

  it("reads a logical-failure envelope returned at HTTP 200", () => {
    const envelope = readBackendEnvelope({
      StatusCode: 404,
      IsSuccess: false,
      Message: "Project not found.",
      Data: null,
    });

    expect(envelope.isSuccess).toBe(false);
    expect(envelope.statusCode).toBe(404);
    expect(envelope.message).toBe("Project not found.");
    expect(envelope.data).toBeNull();
  });

  it("defaults to a successful envelope for a bare (non-enveloped) payload", () => {
    const envelope = readBackendEnvelope({ foo: "bar" });
    expect(envelope.isSuccess).toBe(true);
    expect(envelope.statusCode).toBe(200);
    expect(envelope.data).toEqual({ foo: "bar" });
  });

  it("defaults to a successful envelope for non-object payloads", () => {
    expect(readBackendEnvelope(null)).toEqual({ isSuccess: true, statusCode: 200, data: null });
    expect(readBackendEnvelope("not-an-object")).toEqual({
      isSuccess: true,
      statusCode: 200,
      data: "not-an-object",
    });
    expect(readBackendEnvelope(undefined)).toEqual({
      isSuccess: true,
      statusCode: 200,
      data: undefined,
    });
  });
});

describe("toHttpStatus", () => {
  it("passes through a valid 4xx/5xx integer status code", () => {
    expect(toHttpStatus(404, 400)).toBe(404);
    expect(toHttpStatus(500, 400)).toBe(500);
    expect(toHttpStatus(599, 400)).toBe(599);
  });

  it("falls back for out-of-range, non-integer, or missing status codes", () => {
    expect(toHttpStatus(0, 400)).toBe(400);
    expect(toHttpStatus(200, 400)).toBe(400);
    expect(toHttpStatus(600, 400)).toBe(400);
    expect(toHttpStatus(1.5, 400)).toBe(400);
    expect(toHttpStatus(Number.NaN, 400)).toBe(400);
  });
});

describe("resolveEnvelopeFailure", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("forwards the backend's message for an expected 4xx logical failure", () => {
    const result = resolveEnvelopeFailure(
      { isSuccess: false, statusCode: 404, message: "Project not found.", data: null },
      "Project not found.",
      404
    );

    expect(result).toEqual({ status: 404, message: "Project not found." });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("uses the fallback status when the envelope's statusCode is not a valid HTTP error code", () => {
    const result = resolveEnvelopeFailure(
      { isSuccess: false, statusCode: 0, message: "Odd backend message", data: null },
      "Unable to load the resource.",
      400
    );

    expect(result).toEqual({ status: 400, message: "Odd backend message" });
  });

  it("hides the backend's raw message and logs server-side for a 5xx logical failure (finding #1)", () => {
    const result = resolveEnvelopeFailure(
      { isSuccess: false, statusCode: 500, message: "NullReferenceException at Foo.Bar", data: null },
      "Project not found.",
      404
    );

    expect(result).toEqual({ status: 500, message: "Project not found." });
    expect(logger.error).toHaveBeenCalledWith(
      "Backend reported a logical failure",
      expect.objectContaining({ status: 500 })
    );
  });

  it("falls back to the generic message when the envelope has no message", () => {
    const result = resolveEnvelopeFailure(
      { isSuccess: false, statusCode: 404, data: null },
      "Project not found.",
      404
    );

    expect(result).toEqual({ status: 404, message: "Project not found." });
  });
});
