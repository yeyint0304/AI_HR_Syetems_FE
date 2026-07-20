import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TimesheetPeriodForm } from "@/components/timesheetPeriods/TimesheetPeriodForm";
import { apiClient } from "@/lib/api/axiosInstance";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: 0 }, queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("TimesheetPeriodForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the period start/end fields and a Save button", () => {
    renderWithClient(<TimesheetPeriodForm />);

    expect(screen.getByLabelText(/period start/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/period end/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save period/i })).toBeInTheDocument();
  });

  it("shows client-side validation errors when submitted empty", async () => {
    const user = userEvent.setup();
    renderWithClient(<TimesheetPeriodForm />);

    await user.click(screen.getByRole("button", { name: /save period/i }));

    expect(await screen.findByText(/period start date is required/i)).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("rejects an end date before the start date", async () => {
    const user = userEvent.setup();
    renderWithClient(<TimesheetPeriodForm />);

    // `<input type="date">` doesn't reliably support `user.type()` under jsdom,
    // so the value is set directly via `fireEvent.change` (matches the
    // convention in `components/projects/__tests__/ProjectForm.test.tsx`).
    fireEvent.change(screen.getByLabelText(/period start/i), { target: { value: "2026-05-15" } });
    fireEvent.change(screen.getByLabelText(/period end/i), { target: { value: "2026-03-01" } });
    await user.click(screen.getByRole("button", { name: /save period/i }));

    expect(await screen.findByText(/period end date must be on or after/i)).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("submits the create payload and redirects to /timesheet-periods", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { data: { id: "1" } } });
    const user = userEvent.setup();
    renderWithClient(<TimesheetPeriodForm />);

    fireEvent.change(screen.getByLabelText(/period start/i), { target: { value: "2026-03-01" } });
    fireEvent.change(screen.getByLabelText(/period end/i), { target: { value: "2026-05-15" } });
    await user.click(screen.getByRole("button", { name: /save period/i }));

    await screen.findByRole("button", { name: /save period/i });
    expect(apiClient.post).toHaveBeenCalledWith("/timesheet-periods", {
      periodStart: "2026-03-01",
      periodEnd: "2026-05-15",
    });
    expect(mockPush).toHaveBeenCalledWith("/timesheet-periods");
  });

  it("shows the backend error message when creation fails", async () => {
    (apiClient.post as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: "A timesheet period already exists for this range." } },
    });
    const user = userEvent.setup();
    renderWithClient(<TimesheetPeriodForm />);

    fireEvent.change(screen.getByLabelText(/period start/i), { target: { value: "2026-03-01" } });
    fireEvent.change(screen.getByLabelText(/period end/i), { target: { value: "2026-05-15" } });
    await user.click(screen.getByRole("button", { name: /save period/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/already exists/i);
  });
});
