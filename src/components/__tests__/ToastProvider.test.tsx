import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ToastProvider, useToast } from "../ToastProvider";

function ShowToastButton({ message = "Saved successfully!" }: { message?: string }) {
  const { showToast } = useToast();
  return (
    <button type="button" onClick={() => showToast(message, "success")}>
      Trigger toast
    </button>
  );
}

function ThrowsOutsideProvider() {
  useToast();
  return null;
}

describe("ToastProvider / useToast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("throws when useToast is used outside of a ToastProvider", () => {
    // Suppress the expected React error boundary console output for this negative test.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ThrowsOutsideProvider />)).toThrow(
      "useToast must be used within a ToastProvider.",
    );
    spy.mockRestore();
  });

  it("shows a toast message when showToast is called and auto-dismisses it", () => {
    render(
      <ToastProvider>
        <ShowToastButton />
      </ToastProvider>,
    );

    expect(screen.queryByText("Saved successfully!")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Trigger toast" }));
    expect(screen.getByText("Saved successfully!")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.queryByText("Saved successfully!")).not.toBeInTheDocument();
  });
});
