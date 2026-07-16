import { render, screen, waitFor } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import { QueryProvider } from "@/components/providers/QueryProvider";

function ProbeChild() {
  return <div>child rendered</div>;
}

function QueryConsumer() {
  const { data, isSuccess } = useQuery({
    queryKey: ["probe"],
    queryFn: async () => "ok",
  });
  return <div>{isSuccess ? `result: ${data}` : "loading"}</div>;
}

describe("QueryProvider", () => {
  it("renders its children", () => {
    render(
      <QueryProvider>
        <ProbeChild />
      </QueryProvider>
    );

    expect(screen.getByText("child rendered")).toBeInTheDocument();
  });

  it("renders more than one child without error", () => {
    render(
      <QueryProvider>
        <ProbeChild />
        <ProbeChild />
      </QueryProvider>
    );

    expect(screen.getAllByText("child rendered")).toHaveLength(2);
  });

  it("supplies a working QueryClient context to descendants (useQuery does not throw)", async () => {
    render(
      <QueryProvider>
        <QueryConsumer />
      </QueryProvider>
    );

    expect(screen.getByText("loading")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("result: ok")).toBeInTheDocument());
  });
});
