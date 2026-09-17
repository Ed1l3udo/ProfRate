import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Pagination } from "./Pagination.js";

describe("Pagination", () => {
  afterEach(cleanup);
  it.each([[1, 2, true, false], [2, 2, false, true], [1, 0, true, true]])("renders limits for page %i of %i", (page, totalPages, previousDisabled, nextDisabled) => {
    const onPage = vi.fn(); render(<Pagination page={page} totalPages={totalPages} onPage={onPage} />);
    expect(screen.getByText(`Página ${totalPages === 0 ? 0 : page} de ${totalPages}`)).toBeInTheDocument();
    const previous = screen.getByRole("button", { name: "Anterior" }); const next = screen.getByRole("button", { name: "Próxima" });
    previousDisabled ? expect(previous).toBeDisabled() : expect(previous).toBeEnabled();
    nextDisabled ? expect(next).toBeDisabled() : expect(next).toBeEnabled();
    if (totalPages === 2 && page === 1) { fireEvent.click(screen.getByRole("button", { name: "Próxima" })); expect(onPage).toHaveBeenCalledWith(2); }
  });
});
