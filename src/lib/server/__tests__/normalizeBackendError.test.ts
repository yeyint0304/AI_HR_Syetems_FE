/**
 * @jest-environment node
 */
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { logger } from "@/lib/utils/logger";

jest.mock("@/lib/utils/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

describe("normalizeBackendError", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("forwards a backend-provided message for a 4xx response (camelCase message)", () => {
    const error = { isAxiosError: true, response: { status: 400, data: { message: "Username already taken." } } };
    expect(normalizeBackendError(error)).toEqual({ status: 400, message: "Username already taken." });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("forwards a backend-provided message for a 4xx response (PascalCase Message)", () => {
    const error = { isAxiosError: true, response: { status: 409, data: { Message: "Email already in use." } } };
    expect(normalizeBackendError(error)).toEqual({ status: 409, message: "Email already in use." });
  });

  it("falls back to the ASP.NET ProblemDetails title when no message field is present", () => {
    const error = { isAxiosError: true, response: { status: 422, data: { title: "One or more validation errors occurred." } } };
    expect(normalizeBackendError(error)).toEqual({
      status: 422,
      message: "One or more validation errors occurred.",
    });
  });

  it("uses the fallback message and logs when a 4xx response has no message at all", () => {
    const error = { isAxiosError: true, response: { status: 400, data: {} } };
    const result = normalizeBackendError(error, "Unable to create the user. Please try again.");
    expect(result).toEqual({ status: 400, message: "Unable to create the user. Please try again." });
    expect(logger.error).toHaveBeenCalled();
  });

  it("maps a 5xx response to a generic 502 with the fallback message, logging the real error", () => {
    const error = { isAxiosError: true, response: { status: 500, data: { message: "Stack trace leak" } } };
    const result = normalizeBackendError(error, "Something went wrong. Please try again later.");
    expect(result).toEqual({ status: 502, message: "Something went wrong. Please try again later." });
    expect(logger.error).toHaveBeenCalledWith("Backend request failed", { status: 500, data: { message: "Stack trace leak" } });
  });

  it("maps a network failure (no response) to a 502 with the fallback message", () => {
    const error = { isAxiosError: true, response: undefined, code: "ECONNREFUSED" };
    const result = normalizeBackendError(error);
    expect(result).toEqual({ status: 502, message: "Something went wrong. Please try again later." });
  });

  it("maps a non-Axios error to a generic 500, logging the raw error", () => {
    const error = new Error("boom");
    const result = normalizeBackendError(error, "Unable to update your profile. Please try again.");
    expect(result).toEqual({ status: 500, message: "Unable to update your profile. Please try again." });
    expect(logger.error).toHaveBeenCalledWith("Unexpected error calling backend", error);
  });
});
