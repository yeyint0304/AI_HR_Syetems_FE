import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TotalProjectsStat } from "@/components/home/TotalProjectsStat";
import { apiClient } from "@/lib/api/axiosInstance";
import { useAuthStore } from "@/stores/auth.store";
import { USER_ROLES } from "@/lib/constants/auth.constants";

jest.mock("@/lib/api/axiosInstance", () => ({
  apiClient: { get: jest.fn() },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("TotalProjectsStat", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: null });
  });

  it("fetches the org-wide project list (/projects) for a SystemAdmin", async () => {
    useAuthStore.setState({
      user: { id: "1", email: "admin@hrsystem.com", role: USER_ROLES.SYSTEM_ADMIN },
    });
    (apiClient.get as jest.Mock).mockImplementation((url: string) =>
      url === "/projects"
        ? Promise.resolve({ data: { data: [{ id: "p1" }, { id: "p2" }, { id: "p3" }] } })
        : Promise.reject(new Error(`Unexpected GET ${url}`))
    );

    renderWithClient(<TotalProjectsStat />);

    expect(await screen.findByText("3")).toBeInTheDocument();
    expect(screen.getByText("Total Projects")).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith("/projects");
    expect(apiClient.get).not.toHaveBeenCalledWith("/projects/my");
  });

  it("fetches the caller's own project list (/projects/my) for a ProjectAdmin/Employee", async () => {
    useAuthStore.setState({
      user: { id: "1", email: "pa@hrsystem.com", role: USER_ROLES.PROJECT_ADMIN },
    });
    (apiClient.get as jest.Mock).mockImplementation((url: string) =>
      url === "/projects/my"
        ? Promise.resolve({ data: { data: [{ id: "p1" }] } })
        : Promise.reject(new Error(`Unexpected GET ${url}`))
    );

    renderWithClient(<TotalProjectsStat />);

    expect(await screen.findByText("1")).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith("/projects/my");
    expect(apiClient.get).not.toHaveBeenCalledWith("/projects");
  });

  it("shows a loading placeholder while the request is in flight", () => {
    (apiClient.get as jest.Mock).mockReturnValue(new Promise(() => {}));
    renderWithClient(<TotalProjectsStat />);

    expect(screen.getByText("…")).toBeInTheDocument();
  });

  it("shows a neutral placeholder and error trend when the request fails", async () => {
    (apiClient.get as jest.Mock).mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: "Unable to load projects." } },
    });

    renderWithClient(<TotalProjectsStat />);

    expect(await screen.findByText("—")).toBeInTheDocument();
    expect(screen.getByText(/unable to load/i)).toBeInTheDocument();
  });
});
