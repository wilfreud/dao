import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ToolPageHeader } from "./ToolPageHeader";

const mockNavigate = vi.fn();
let mockLocationState: unknown = null;

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    state: mockLocationState,
  }),
}));

describe("ToolPageHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocationState = null;
  });

  it("renders title, category, and back button", () => {
    render(<ToolPageHeader title="Test Tool" category="network" />);

    expect(screen.getByText("Test Tool")).toBeInTheDocument();
    expect(screen.getByText("network")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to launcher/i })).toBeInTheDocument();
  });

  it("navigates to '/' when not navigated from launcher", () => {
    mockLocationState = null;
    render(<ToolPageHeader title="Test Tool" />);

    fireEvent.click(screen.getByRole("button", { name: /back to launcher/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("navigates -1 when state indicates fromLauncher", () => {
    mockLocationState = { fromLauncher: true };
    render(<ToolPageHeader title="Test Tool" />);

    fireEvent.click(screen.getByRole("button", { name: /back to launcher/i }));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
