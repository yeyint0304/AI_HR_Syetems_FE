import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProjectForm } from "@/components/projects/ProjectForm";
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

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/project name/i), "Project Alpha");
  await user.type(screen.getByLabelText(/project code/i), "PRJ-ALPHA");
  await user.type(screen.getByLabelText(/client name/i), "Acme Corp");
  await user.type(screen.getByLabelText(/client email/i), "client@acme.com");
  // `<input type="date">` doesn't reliably support `user.type()` under jsdom,
  // so the value is set directly via `fireEvent.change`.
  fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: "2025-01-15" } });
  fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: "2025-12-31" } });
}

describe("ProjectForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("create mode", () => {
    it("renders all required fields and a disabled Active status", () => {
      renderWithClient(<ProjectForm mode="create" />);

      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/project code/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/client name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/client email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/max daily hours/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/status/i)).toBeDisabled();
      expect(screen.getByRole("button", { name: /save project/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /deactivate project/i })).not.toBeInTheDocument();
    });

    it("shows client-side validation errors when submitted empty", async () => {
      const user = userEvent.setup();
      renderWithClient(<ProjectForm mode="create" />);

      await user.click(screen.getByRole("button", { name: /save project/i }));

      expect(await screen.findByText(/project name is required/i)).toBeInTheDocument();
      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it("rejects a lowercase project code", async () => {
      const user = userEvent.setup();
      renderWithClient(<ProjectForm mode="create" />);

      await fillRequiredFields(user);
      await user.clear(screen.getByLabelText(/project code/i));
      await user.type(screen.getByLabelText(/project code/i), "prj-alpha");
      await user.click(screen.getByRole("button", { name: /save project/i }));

      expect(await screen.findByText(/uppercase letters, numbers, and hyphens/i)).toBeInTheDocument();
      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it("submits the create payload (without isActive) and redirects to /projects", async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { data: { id: "1" } } });
      const user = userEvent.setup();
      renderWithClient(<ProjectForm mode="create" />);

      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: /save project/i }));

      await screen.findByRole("button", { name: /save project/i });
      expect(apiClient.post).toHaveBeenCalledWith(
        "/projects",
        expect.objectContaining({
          name: "Project Alpha",
          code: "PRJ-ALPHA",
          clientName: "Acme Corp",
          clientEmail: "client@acme.com",
        })
      );
      const [, payload] = (apiClient.post as jest.Mock).mock.calls[0];
      expect(payload).not.toHaveProperty("isActive");
      expect(mockPush).toHaveBeenCalledWith("/projects");
    });

    it("shows the backend error message when creation fails (e.g. duplicate code)", async () => {
      (apiClient.post as jest.Mock).mockRejectedValueOnce({
        isAxiosError: true,
        response: { data: { message: "Project code is already taken." } },
      });
      const user = userEvent.setup();
      renderWithClient(<ProjectForm mode="create" />);

      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: /save project/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/already taken/i);
    });
  });

  describe("edit mode", () => {
    const initialValues = {
      name: "Project Alpha",
      code: "PRJ-ALPHA",
      clientName: "Acme Corp",
      clientEmail: "client@acme.com",
      startDate: "2025-01-15",
      endDate: "2025-12-31",
      maxDailyHours: 8,
      description: "",
      isActive: true,
    };

    it("pre-fills the form and allows editing the Status field", () => {
      renderWithClient(<ProjectForm mode="edit" projectId="1" initialValues={initialValues} />);

      expect(screen.getByLabelText(/project name/i)).toHaveValue("Project Alpha");
      expect(screen.getByLabelText(/status/i)).not.toBeDisabled();
      expect(screen.getByRole("button", { name: /deactivate project/i })).toBeInTheDocument();
    });

    it("submits an update via PUT and redirects to /projects", async () => {
      (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: { data: { id: "1" } } });
      const user = userEvent.setup();
      renderWithClient(<ProjectForm mode="edit" projectId="1" initialValues={initialValues} />);

      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await screen.findByRole("button", { name: /save changes/i });
      expect(apiClient.put).toHaveBeenCalledWith("/projects/1", expect.objectContaining({ isActive: true }));
      expect(mockPush).toHaveBeenCalledWith("/projects");
    });

    it("deactivates the project after confirming in the dialog", async () => {
      (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: { data: { id: "1" } } });
      const user = userEvent.setup();
      renderWithClient(<ProjectForm mode="edit" projectId="1" initialValues={initialValues} />);

      await user.click(screen.getByRole("button", { name: /deactivate project/i }));
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /^deactivate$/i }));

      expect(apiClient.put).toHaveBeenCalledWith(
        "/projects/1",
        expect.objectContaining({ isActive: false })
      );
    });
  });
});
