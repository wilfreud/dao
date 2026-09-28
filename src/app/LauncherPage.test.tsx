import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { LauncherPage } from "./LauncherPage";
import { LauncherStateProvider } from "./launcher-state";

function renderLauncher() {
  return render(
    <LauncherStateProvider>
      <MemoryRouter>
        <LauncherPage />
      </MemoryRouter>
    </LauncherStateProvider>
  );
}

describe("LauncherPage", () => {
  it("renders search input with autofocus and all initial tool tiles", () => {
    renderLauncher();

    const searchInput = screen.getByRole("searchbox");
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveFocus();

    expect(screen.getByText("LAN Drop Server")).toBeInTheDocument();
    expect(screen.getByText("Env Scrubber")).toBeInTheDocument();
  });

  it("filters tiles as the user types an intent query", () => {
    renderLauncher();

    const searchInput = screen.getByRole("searchbox");
    fireEvent.change(searchInput, {
      target: { value: "receive file from my iphone" },
    });

    expect(screen.getByText("LAN Drop Server")).toBeInTheDocument();
    expect(screen.queryByText("Env Scrubber")).not.toBeInTheDocument();
  });

  it("clears query on Escape key", () => {
    renderLauncher();

    const searchInput = screen.getByRole("searchbox") as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: "secret env" } });
    expect(searchInput.value).toBe("secret env");

    fireEvent.keyDown(searchInput, { key: "Escape" });
    expect(searchInput.value).toBe("");
    expect(screen.getByText("LAN Drop Server")).toBeInTheDocument();
    expect(screen.getByText("Env Scrubber")).toBeInTheDocument();
  });

  it("clears query on clear button click", () => {
    renderLauncher();

    const searchInput = screen.getByRole("searchbox") as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: "test" } });

    const clearButton = screen.getByRole("button", { name: /clear search/i });
    fireEvent.click(clearButton);

    expect(searchInput.value).toBe("");
    expect(screen.getByText("LAN Drop Server")).toBeInTheDocument();
  });

  it("displays helpful no-results state when nothing matches", () => {
    renderLauncher();

    const searchInput = screen.getByRole("searchbox");
    fireEvent.change(searchInput, {
      target: { value: "completelyunrelatedtoolquery123" },
    });

    expect(screen.queryByText("LAN Drop Server")).not.toBeInTheDocument();
    expect(screen.queryByText("Env Scrubber")).not.toBeInTheDocument();
    expect(
      screen.getByText(/No tools matching/i)
    ).toBeInTheDocument();
  });
});
