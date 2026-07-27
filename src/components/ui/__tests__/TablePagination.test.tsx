import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TablePagination } from "@/components/ui/TablePagination";

describe("TablePagination", () => {
  it("renders nothing when there is only one page", () => {
    render(<TablePagination page={1} totalPages={1} onPageChange={jest.fn()} label="Currencies pagination" />);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("renders the current page and disables Previous on the first page", () => {
    render(<TablePagination page={1} totalPages={3} onPageChange={jest.fn()} label="Currencies pagination" />);

    expect(screen.getByRole("navigation", { name: "Currencies pagination" })).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next/i })).toBeEnabled();
  });

  it("disables Next on the last page", () => {
    render(<TablePagination page={3} totalPages={3} onPageChange={jest.fn()} label="Currencies pagination" />);

    expect(screen.getByRole("button", { name: /previous/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("calls onPageChange with the next/previous page number", async () => {
    const onPageChange = jest.fn();
    const user = userEvent.setup();
    render(<TablePagination page={2} totalPages={3} onPageChange={onPageChange} label="Currencies pagination" />);

    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    await user.click(screen.getByRole("button", { name: /previous/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});
