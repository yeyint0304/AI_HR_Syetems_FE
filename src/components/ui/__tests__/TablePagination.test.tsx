import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import { TablePagination } from "@/components/ui/TablePagination";

expect.extend(toHaveNoViolations);

describe("TablePagination", () => {
  it("renders nothing when there is only one page", () => {
    render(<TablePagination page={1} totalPages={1} onPageChange={jest.fn()} label="Currencies pagination" />);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("renders the current page, numbered page links, and disables Previous on the first page", () => {
    render(<TablePagination page={1} totalPages={3} onPageChange={jest.fn()} label="Currencies pagination" />);

    expect(screen.getByRole("navigation", { name: "Currencies pagination" })).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    // react-paginate renders Previous/Next/page controls as `<a role="button">`
    // elements carrying `aria-disabled` rather than a native `disabled`
    // attribute, so assert against `aria-disabled` here (jest-dom's
    // `toBeDisabled()` only recognizes real form controls).
    expect(screen.getByRole("button", { name: /previous/i })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: /next/i })).toHaveAttribute("aria-disabled", "false");
    expect(screen.getByRole("button", { name: "Page 1 is your current page" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Page 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Page 3" })).toBeInTheDocument();
  });

  it("disables Next on the last page", () => {
    render(<TablePagination page={3} totalPages={3} onPageChange={jest.fn()} label="Currencies pagination" />);

    expect(screen.getByRole("button", { name: /previous/i })).toHaveAttribute("aria-disabled", "false");
    expect(screen.getByRole("button", { name: /next/i })).toHaveAttribute("aria-disabled", "true");
  });

  it("calls onPageChange with the next page number", async () => {
    const onPageChange = jest.fn();
    const user = userEvent.setup();
    render(<TablePagination page={2} totalPages={3} onPageChange={onPageChange} label="Currencies pagination" />);

    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("calls onPageChange with the previous page number", async () => {
    const onPageChange = jest.fn();
    const user = userEvent.setup();
    render(<TablePagination page={2} totalPages={3} onPageChange={onPageChange} label="Currencies pagination" />);

    await user.click(screen.getByRole("button", { name: /previous/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("calls onPageChange with a specific page number when a numbered page link is clicked", async () => {
    const onPageChange = jest.fn();
    const user = userEvent.setup();
    render(<TablePagination page={1} totalPages={3} onPageChange={onPageChange} label="Currencies pagination" />);

    await user.click(screen.getByRole("button", { name: "Page 3" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("ignores clicks while isDisabled", async () => {
    const onPageChange = jest.fn();
    const user = userEvent.setup();
    render(
      <TablePagination
        page={2}
        totalPages={3}
        onPageChange={onPageChange}
        label="Currencies pagination"
        isDisabled
      />
    );

    expect(screen.getByRole("button", { name: /next/i }).closest("div")).toHaveAttribute(
      "aria-disabled",
      "true"
    );
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it("exposes exactly one `navigation` landmark (no nested landmark from react-paginate's internal `<ul>`)", () => {
    render(<TablePagination page={1} totalPages={3} onPageChange={jest.fn()} label="Currencies pagination" />);

    // react-paginate's `PaginationBoxView` hardcodes an inner
    // `<ul role="navigation" aria-label="Pagination">`; `TablePagination`
    // strips that role/label post-mount so callers are left with a single,
    // correctly-named `<nav>` landmark instead of two nested ones.
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
    expect(screen.getByRole("navigation")).toHaveAccessibleName("Currencies pagination");
  });

  it("preserves native list/listitem semantics for the page-link list", () => {
    render(<TablePagination page={1} totalPages={3} onPageChange={jest.fn()} label="Currencies pagination" />);

    // Stripping `role="navigation"` off react-paginate's inner `<ul>`
    // restores its implicit `list` role, which in turn restores its `<li>`
    // children's implicit `listitem` role (Previous + 3 pages + Next = 5).
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("has no detectable accessibility violations (jest-axe)", async () => {
    const { container } = render(
      <TablePagination page={2} totalPages={5} onPageChange={jest.fn()} label="Currencies pagination" />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
