import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProjectsListView } from "@/components/projects/ProjectsListView";
import { apiClient } from "@/lib/api/axiosInstance";
import { useAuthStore } from "@/stores/auth.store";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: 0 }, queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const PROJECT_ALPHA = {
  id: "1",
  code: "PRJ-ALPHA",
  name: "Project Alpha - Web Platform",
  clientName: "Acme Corp",
  clientEmail: "client@acme.com",
  startDate: "2025-01-15",
  endDate: "2025-12-31",
  maxDailyHours: 8,
  isActive: true,
};

const PROJECT_BETA = {
  id: "2",
  code: "PRJ-BETA",
  name: "Project Beta - Mobile App",
  clientName: "TechStart Inc",
  clientEmail: "client@techstart.com",
  startDate: "2025-03-01",
  endDate: "2025-09-30",
  maxDailyHours: 6,
  isActive: true,
};

describe("ProjectsListView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: null });
  });

  it("shows a loading state while fetching", () => {
    (apiClient.get as jest.Mock).mockReturnValueOnce(new Promise(() => {}));
    renderWithClient(<ProjectsListView />);

    expect(screen.getByRole("status")).toHaveTextContent(/loading projects/i);
  });

  it("renders the project table once loaded", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { data: [PROJECT_ALPHA, PROJECT_BETA] },
    });
    renderWithClient(<ProjectsListView />);

    expect(await screen.findByText("PRJ-ALPHA")).toBeInTheDocument();
    expect(screen.getByText("PRJ-BETA")).toBeInTheDocument();
  });

  it("shows an empty state when there are no projects", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: [] } });
    renderWithClient(<ProjectsListView />);

    expect(await screen.findByText(/no projects yet/i)).toBeInTheDocument();
  });

  it("shows an error state with a retry action when loading fails", async () => {
    (apiClient.get as jest.Mock).mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: "Unable to load projects." } },
    });
    renderWithClient(<ProjectsListView />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/unable to load projects/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("filters the table by the search term", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { data: [PROJECT_ALPHA, PROJECT_BETA] },
    });
    const user = userEvent.setup();
    renderWithClient(<ProjectsListView />);

    await screen.findByText("PRJ-ALPHA");
    await user.type(screen.getByLabelText(/search projects/i), "Acme");

    expect(screen.getByText("PRJ-ALPHA")).toBeInTheDocument();
    expect(screen.queryByText("PRJ-BETA")).not.toBeInTheDocument();
  });

  it("paginates the table client-side when there are more projects than fit on one page", async () => {
    const manyProjects = Array.from({ length: 25 }, (_, index) => ({
      ...PROJECT_ALPHA,
      id: `project-${index}`,
      code: `PRJ-${String(index).padStart(3, "0")}`,
      name: `Project ${index}`,
    }));
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: manyProjects } });
    const user = userEvent.setup();
    renderWithClient(<ProjectsListView />);

    await screen.findByText("PRJ-000");
    expect(screen.queryByText("PRJ-020")).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /projects pagination/i })).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(await screen.findByText("PRJ-020")).toBeInTheDocument();
    expect(screen.queryByText("PRJ-000")).not.toBeInTheDocument();
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  });

  it("hides the Actions column and New Project link for a non-manager role", async () => {
    useAuthStore.setState({ user: { id: "1", email: "user@hrsystem.com", role: "User" } });
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: [PROJECT_ALPHA] } });
    renderWithClient(<ProjectsListView />);

    await screen.findByText("PRJ-ALPHA");
    expect(screen.queryByRole("link", { name: /new project/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });

  it("shows the Actions column and New Project link for a ProjectAdmin", async () => {
    useAuthStore.setState({ user: { id: "1", email: "sarah@hrsystem.com", role: "ProjectAdmin" } });
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: [PROJECT_ALPHA] } });
    renderWithClient(<ProjectsListView />);

    await screen.findByText("PRJ-ALPHA");
    expect(screen.getByRole("link", { name: /new project/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("deletes a project after confirming in the dialog", async () => {
    useAuthStore.setState({ user: { id: "1", email: "sarah@hrsystem.com", role: "ProjectAdmin" } });
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: [PROJECT_ALPHA] } });
    (apiClient.delete as jest.Mock).mockResolvedValueOnce({ data: {} });
    const user = userEvent.setup();
    renderWithClient(<ProjectsListView />);

    await screen.findByText("PRJ-ALPHA");
    await user.click(screen.getByRole("button", { name: /delete/i }));

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: /^delete$/i }));

    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith("/projects/1"));
  });
});
