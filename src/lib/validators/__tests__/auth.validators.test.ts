import {
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
  createUserSchema,
} from "@/lib/validators/auth.validators";

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({
      usernameOrEmail: "jane.doe",
      password: "anything",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty username/email", () => {
    const result = loginSchema.safeParse({ usernameOrEmail: "", password: "secret" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/required/i);
    }
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({ usernameOrEmail: "jane.doe", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  const base = {
    currentPassword: "OldPass1!",
    newPassword: "NewPass1!",
    confirmNewPassword: "NewPass1!",
  };

  it("accepts a strong, matching new password different from the current one", () => {
    expect(changePasswordSchema.safeParse(base).success).toBe(true);
  });

  it("rejects when confirmation does not match", () => {
    const result = changePasswordSchema.safeParse({
      ...base,
      confirmNewPassword: "Mismatch1!",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === "Passwords do not match.")).toBe(true);
    }
  });

  it("rejects when the new password equals the current password", () => {
    const result = changePasswordSchema.safeParse({
      ...base,
      newPassword: base.currentPassword,
      confirmNewPassword: base.currentPassword,
    });
    expect(result.success).toBe(false);
  });

  it.each([
    ["short1!", "too short"],
    ["alllowercase1!", "missing uppercase"],
    ["ALLUPPERCASE1!", "missing lowercase"],
    ["NoNumbersHere!", "missing number"],
    ["NoSpecialChars1", "missing special character"],
  ])("rejects weak password %s (%s)", (weakPassword) => {
    const result = changePasswordSchema.safeParse({
      ...base,
      newPassword: weakPassword,
      confirmNewPassword: weakPassword,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateProfileSchema", () => {
  it("accepts a valid profile payload without a country", () => {
    const result = updateProfileSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      countryId: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = updateProfileSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });
});

describe("createUserSchema", () => {
  const base = {
    username: "newuser",
    email: "newuser@example.com",
    password: "Password1!",
    firstName: "New",
    lastName: "User",
    employeeId: "",
    countryId: "",
  };

  it("accepts a seeded backend Role id (e.g. SystemAdmin) as roleId", () => {
    // Regression test: `Auth/GetRoles` returns seeded role ids like this one
    // (`docs/HR_System_BE.postman_collection.json`), which fail Zod's
    // stricter `z.uuid()` — this previously left the Create User form stuck
    // showing "Select a role." even after a role had been picked.
    const result = createUserSchema.safeParse({
      ...base,
      roleId: "11111111-1111-1111-1111-111111111101",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing roleId", () => {
    const result = createUserSchema.safeParse({ ...base, roleId: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === "Select a role.")).toBe(true);
    }
  });
});
