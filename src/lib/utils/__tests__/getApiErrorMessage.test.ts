import { AxiosError, AxiosHeaders } from "axios";
import { getApiErrorMessage, getApiFieldErrors } from "@/lib/utils/getApiErrorMessage";

function makeAxiosError(data: unknown, status = 400) {
  return new AxiosError(
    "Request failed",
    "ERR_BAD_REQUEST",
    undefined,
    undefined,
    {
      status,
      statusText: "Bad Request",
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
      data,
    }
  );
}

describe("getApiErrorMessage", () => {
  it("returns the backend-provided message for an Axios error", () => {
    const error = makeAxiosError({ message: "Invalid credentials." });
    expect(getApiErrorMessage(error)).toBe("Invalid credentials.");
  });

  it("falls back to the default message when the backend provides none", () => {
    const error = makeAxiosError({});
    expect(getApiErrorMessage(error)).toBe("Something went wrong. Please try again.");
  });

  it("falls back to a custom message for a non-Axios error", () => {
    expect(getApiErrorMessage(new Error("boom"), "Custom fallback")).toBe("Custom fallback");
  });
});

describe("getApiFieldErrors", () => {
  it("extracts field-level validation errors from an Axios error", () => {
    const error = makeAxiosError({ errors: { email: ["Enter a valid email address."] } });
    expect(getApiFieldErrors(error)).toEqual({ email: ["Enter a valid email address."] });
  });

  it("returns undefined for a non-Axios error", () => {
    expect(getApiFieldErrors(new Error("boom"))).toBeUndefined();
  });
});
