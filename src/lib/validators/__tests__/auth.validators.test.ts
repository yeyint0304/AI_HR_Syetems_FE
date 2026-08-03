import {
  loginSchema,
  changePasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  createUserSchema,
  updateUserSchema,
  unassignedUserQuerySchema,
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

describe("resetPasswordSchema", () => {
  it("accepts a strong, matching new password (no currentPassword field required)", () => {
    const result = resetPasswordSchema.safeParse({
      newPassword: "NewPass1!",
      confirmNewPassword: "NewPass1!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when confirmation does not match", () => {
    const result = resetPasswordSchema.safeParse({
      newPassword: "NewPass1!",
      confirmNewPassword: "Mismatch1!",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === "Passwords do not match.")).toBe(
        true
      );
    }
  });

  it.each([
    ["short1!", "too short"],
    ["alllowercase1!", "missing uppercase"],
    ["ALLUPPERCASE1!", "missing lowercase"],
    ["NoNumbersHere!", "missing number"],
    ["NoSpecialChars1", "missing special character"],
  ])("rejects weak password %s (%s)", (weakPassword) => {
    const result = resetPasswordSchema.safeParse({
      newPassword: weakPassword,
      confirmNewPassword: weakPassword,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateProfileSchema", () => {
  // Per the `feature/user-deactivate` request, `countryId` is now required
  // (previously optional/nullable) — mirrors `createUserSchema`/`updateUserSchema`.
  it("accepts a valid profile payload with a country", () => {
    const result = updateProfileSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      countryId: "aa532dd2-1a51-4be0-b09b-be3d99ea15f3",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing country", () => {
    const result = updateProfileSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      countryId: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === "Country is required.")).toBe(true);
    }
  });

  it("rejects an invalid email", () => {
    const result = updateProfileSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      email: "not-an-email",
      countryId: "aa532dd2-1a51-4be0-b09b-be3d99ea15f3",
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
    countryId: "aa532dd2-1a51-4be0-b09b-be3d99ea15f3",
    roleId: "11111111-1111-1111-1111-111111111101",
  };

  it("accepts a seeded backend Role id (e.g. SystemAdmin) as roleId", () => {
    // Regression test: `Auth/GetRoles` returns seeded role ids like this one
    // (`docs/HR_System_BE.postman_collection.json`), which fail Zod's
    // stricter `z.uuid()` — this previously left the Create User form stuck
    // showing "Select a role." even after a role had been picked.
    const result = createUserSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("rejects a missing roleId", () => {
    const result = createUserSchema.safeParse({ ...base, roleId: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === "Select a role.")).toBe(true);
    }
  });

  // Per the `feature/user-deactivate` request ("make country a required field").
  it("rejects a missing country", () => {
    const result = createUserSchema.safeParse({ ...base, countryId: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === "Country is required.")).toBe(true);
    }
  });
});

describe("updateUserSchema", () => {
  const base = {
    username: "tester",
    email: "tester@example.com",
    firstName: "Tester",
    lastName: "Sample",
    employeeId: "",
    countryId: "aa532dd2-1a51-4be0-b09b-be3d99ea15f3",
    isActive: true,
    roleId: "",
  };

  it("accepts a valid update payload with an empty (unchanged) role", () => {
    expect(updateUserSchema.safeParse(base).success).toBe(true);
  });

  it("accepts a seeded backend Role id (e.g. SystemAdmin) as roleId, same as createUserSchema", () => {
    const result = updateUserSchema.safeParse({
      ...base,
      roleId: "11111111-1111-1111-1111-111111111101",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a username shorter than 3 characters", () => {
    const result = updateUserSchema.safeParse({ ...base, username: "ab" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = updateUserSchema.safeParse({ ...base, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing isActive flag", () => {
    const withoutIsActive: Record<string, unknown> = { ...base };
    delete withoutIsActive.isActive;
    const result = updateUserSchema.safeParse(withoutIsActive);
    expect(result.success).toBe(false);
  });

  it("rejects a malformed (non-GUID) roleId", () => {
    const result = updateUserSchema.safeParse({ ...base, roleId: "not-a-guid" });
    expect(result.success).toBe(false);
  });

  // Per the `feature/user-deactivate` request ("also required on Edit User").
  it("rejects a missing country", () => {
    const result = updateUserSchema.safeParse({ ...base, countryId: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === "Country is required.")).toBe(true);
    }
  });
});

describe("unassignedUserQuerySchema", () => {
  it("accepts an empty query (all fields optional)", () => {
    expect(unassignedUserQuerySchema.safeParse({}).success).toBe(true);
  });

  it("accepts a valid search/page/pageSize combination and coerces numeric strings", () => {
    const result = unassignedUserQuerySchema.safeParse({ search: "jamie", page: "2", pageSize: "20" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ search: "jamie", page: 2, pageSize: 20 });
    }
  });

  it("trims the search term", () => {
    const result = unassignedUserQuerySchema.safeParse({ search: "  jamie  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBe("jamie");
    }
  });

  it("rejects a search term longer than 100 characters", () => {
    const result = unassignedUserQuerySchema.safeParse({ search: "a".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("rejects page numbers below 1", () => {
    expect(unassignedUserQuerySchema.safeParse({ page: 0 }).success).toBe(false);
  });

  it("rejects a pageSize above 50", () => {
    expect(unassignedUserQuerySchema.safeParse({ pageSize: 51 }).success).toBe(false);
  });

  it("rejects a non-numeric page", () => {
    expect(unassignedUserQuerySchema.safeParse({ page: "not-a-number" }).success).toBe(false);
  });
});
