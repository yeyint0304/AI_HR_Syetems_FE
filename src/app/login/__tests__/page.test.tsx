import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

async function renderLoginPage() {
  vi.resetModules();
  window.localStorage.clear();
  const { default: LoginPage } = await import("../page");
  render(<LoginPage />);
}

describe("LoginPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    window.localStorage.clear();
  });

  it("renders the login form", async () => {
    await renderLoginPage();

    expect(screen.getByRole("heading", { name: "Log in" })).toBeInTheDocument();
    expect(screen.getByLabelText("Username or email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();
  });

  it("shows field-level validation errors when submitted empty", async () => {
    const user = userEvent.setup();
    await renderLoginPage();

    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Username or email is required.")).toBeInTheDocument();
    expect(screen.getByText("Password is required.")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("logs in and redirects to the dashboard on valid credentials", async () => {
    const user = userEvent.setup();
    await renderLoginPage();

    await user.type(screen.getByLabelText("Username or email"), "admin");
    await user.type(screen.getByLabelText("Password"), "Password@123");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(pushMock).toHaveBeenCalledWith("/");
  });

  it("shows a form-level error and does not redirect on invalid credentials", async () => {
    const user = userEvent.setup();
    await renderLoginPage();

    await user.type(screen.getByLabelText("Username or email"), "admin");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid username/email or password.",
    );
    expect(pushMock).not.toHaveBeenCalled();
  });
});
