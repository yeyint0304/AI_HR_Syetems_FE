/**
 * @jest-environment node
 */
import { readBackendEnvelope } from "@/lib/server/backendEnvelope";

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
