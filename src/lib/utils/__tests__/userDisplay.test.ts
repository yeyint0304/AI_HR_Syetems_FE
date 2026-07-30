import { getFullName, getUserInitials } from "@/lib/utils/userDisplay";

describe("getFullName", () => {
  it("returns 'First Last' when both are present", () => {
    expect(getFullName({ firstName: "Jane", lastName: "Doe", username: "jdoe", email: "jane@x.com" })).toBe(
      "Jane Doe"
    );
  });

  it("prefers the full name over username/email", () => {
    expect(getFullName({ firstName: "Jane", lastName: "Doe", username: "jdoe", email: "jane@x.com" })).toBe(
      "Jane Doe"
    );
  });

  it("falls back to username when no name is available", () => {
    expect(getFullName({ username: "jdoe", email: "jane@x.com" })).toBe("jdoe");
  });

  it("falls back to email when neither name nor username is available", () => {
    expect(getFullName({ email: "jane@x.com" })).toBe("jane@x.com");
  });

  it("returns an empty string for null/undefined users", () => {
    expect(getFullName(null)).toBe("");
    expect(getFullName(undefined)).toBe("");
  });

  it("trims a lone first or last name", () => {
    expect(getFullName({ firstName: "Jane" })).toBe("Jane");
    expect(getFullName({ lastName: "Doe" })).toBe("Doe");
  });
});

describe("getUserInitials", () => {
  it("returns first+last initials, uppercased", () => {
    expect(getUserInitials({ firstName: "jane", lastName: "doe" })).toBe("JD");
  });

  it("falls back to the username's first letter when there is no first name", () => {
    expect(getUserInitials({ username: "jdoe" })).toBe("J");
  });

  it("falls back to the email's first letter when neither name nor username is available", () => {
    expect(getUserInitials({ email: "jane@x.com" })).toBe("J");
  });

  it("returns 'U' when no identifying field is present", () => {
    expect(getUserInitials({})).toBe("U");
  });

  it("returns '?' for a null user", () => {
    expect(getUserInitials(null)).toBe("?");
  });
});
