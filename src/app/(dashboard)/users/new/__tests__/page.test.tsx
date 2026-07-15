import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/mockUsers", () => ({
  createMockUser: vi.fn(),
  isUsernameTaken: vi.fn(),
  isEmailTaken: vi.fn(),
}));

import { createMockUser, isEmailTaken, isUsernameTaken } from "@/lib/mockUsers";
import CreateUserPage from "../page";

function renderPage() {
  render(<CreateUserPage />);
}

describe("CreateUserPage", () => {
  beforeEach(() => {
    vi.mocked(createMockUser).mockReset();
    vi.mocked(isUsernameTaken).mockReset().mockReturnValue(false);
    vi.mocked(isEmailTaken).mockReset().mockReturnValue(false);
  });

  it("renders the create user form", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Create user" })).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Temporary password")).toBeInTheDocument();
  });

  it("shows validation errors for required fields and does not call createMockUser", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Create user" }));

    expect(await screen.findByText("Username is required.")).toBeInTheDocument();
    expect(screen.getByText("Email is required.")).toBeInTheDocument();
    expect(screen.getByText("Password is required.")).toBeInTheDocument();
    expect(screen.getByText("First name is required.")).toBeInTheDocument();
    expect(screen.getByText("Last name is required.")).toBeInTheDocument();
    expect(screen.getByText("Country code is required.")).toBeInTheDocument();
    expect(screen.getByText("Job role is required.")).toBeInTheDocument();
    expect(createMockUser).not.toHaveBeenCalled();
  });

  it("shows an error when the username is already taken", async () => {
    vi.mocked(isUsernameTaken).mockReturnValue(true);
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Username"), "admin");
    await user.click(screen.getByRole("button", { name: "Create user" }));

    expect(await screen.findByText("This username is already taken.")).toBeInTheDocument();
    expect(createMockUser).not.toHaveBeenCalled();
  });

  it("shows an error for an invalid email format", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Create user" }));

    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
  });

  it("shows an error when the password is too short", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Temporary password"), "short");
    await user.click(screen.getByRole("button", { name: "Create user" }));

    expect(
      await screen.findByText("Password must be at least 8 characters."),
    ).toBeInTheDocument();
  });

  it("submits a valid form, shows a success message, and resets the form", async () => {
    vi.mocked(createMockUser).mockReturnValue({
      id: "u-99",
      username: "newuser",
      firstName: "New",
      lastName: "User",
      email: "newuser@hrsystem.com",
      role: "ASSIGNED_USER",
      countryCode: "SG",
      jobRole: "QA",
    });

    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Username"), "newuser");
    await user.type(screen.getByLabelText("Email"), "newuser@hrsystem.com");
    await user.type(screen.getByLabelText("Temporary password"), "Password@123");
    await user.type(screen.getByLabelText("First name"), "New");
    await user.type(screen.getByLabelText("Last name"), "User");
    await user.type(screen.getByLabelText("Country code"), "sg");
    await user.type(screen.getByLabelText("Job role"), "QA");
    await user.click(screen.getByRole("button", { name: "Create user" }));

    expect(createMockUser).toHaveBeenCalledWith(
      expect.objectContaining({ username: "newuser", email: "newuser@hrsystem.com", countryCode: "SG" }),
    );
    expect(
      await screen.findByText('User "newuser" created successfully.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toHaveValue("");
  });

  it("shows a form-level error when createMockUser throws", async () => {
    vi.mocked(createMockUser).mockImplementation(() => {
      throw new Error("boom");
    });

    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Username"), "newuser");
    await user.type(screen.getByLabelText("Email"), "newuser@hrsystem.com");
    await user.type(screen.getByLabelText("Temporary password"), "Password@123");
    await user.type(screen.getByLabelText("First name"), "New");
    await user.type(screen.getByLabelText("Last name"), "User");
    await user.type(screen.getByLabelText("Country code"), "sg");
    await user.type(screen.getByLabelText("Job role"), "QA");
    await user.click(screen.getByRole("button", { name: "Create user" }));

    expect(await screen.findByText("Unable to create user.")).toBeInTheDocument();
  });
});
