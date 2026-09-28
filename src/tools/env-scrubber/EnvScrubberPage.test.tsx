import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { EnvScrubberPage } from "./EnvScrubberPage";
import * as clipboard from "../../foundation/clipboard";
import { MAX_ENV_INPUT_BYTES } from "../../contracts/env-scrubber";

vi.mock("../../foundation/clipboard");

function renderEnvScrubber() {
  return render(
    <MemoryRouter>
      <EnvScrubberPage />
    </MemoryRouter>
  );
}

describe("EnvScrubberPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(clipboard.copyText).mockResolvedValue();
  });

  it("renders with empty input and output textareas and disabled action buttons", () => {
    renderEnvScrubber();

    const inputArea = screen.getByLabelText(
      /input environment variables/i
    ) as HTMLTextAreaElement;
    const outputArea = screen.getByLabelText(
      /redacted environment output/i
    ) as HTMLTextAreaElement;

    expect(inputArea.value).toBe("");
    expect(outputArea.value).toBe("");

    expect(screen.getByRole("button", { name: /clear input/i })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /copy scrubbed output/i })
    ).toBeDisabled();
  });

  it("scrubs dotenv input in real-time and displays safe-to-share badge", () => {
    renderEnvScrubber();

    const inputArea = screen.getByLabelText(
      /input environment variables/i
    ) as HTMLTextAreaElement;

    fireEvent.change(inputArea, {
      target: { value: "DATABASE_URL=postgres://secret\nPORT=3000\n" },
    });

    const outputArea = screen.getByLabelText(
      /redacted environment output/i
    ) as HTMLTextAreaElement;
    expect(outputArea.value).toBe("DATABASE_URL=\nPORT=\n");

    expect(screen.getByText("2 redacted")).toBeInTheDocument();
    expect(screen.getByText("Safe to share")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear input/i })).not.toBeDisabled();
    expect(
      screen.getByRole("button", { name: /copy scrubbed output/i })
    ).not.toBeDisabled();
  });

  it("clears input and output when Clear is clicked", () => {
    renderEnvScrubber();

    const inputArea = screen.getByLabelText(
      /input environment variables/i
    ) as HTMLTextAreaElement;

    fireEvent.change(inputArea, { target: { value: "FOO=bar\n" } });
    expect(inputArea.value).toBe("FOO=bar\n");

    const clearButton = screen.getByRole("button", { name: /clear input/i });
    fireEvent.click(clearButton);

    expect(inputArea.value).toBe("");
    const outputArea = screen.getByLabelText(
      /redacted environment output/i
    ) as HTMLTextAreaElement;
    expect(outputArea.value).toBe("");
  });

  it("copies output to clipboard when Copy is clicked", async () => {
    renderEnvScrubber();

    const inputArea = screen.getByLabelText(
      /input environment variables/i
    ) as HTMLTextAreaElement;

    fireEvent.change(inputArea, { target: { value: "SECRET=12345\n" } });

    const copyButton = screen.getByRole("button", {
      name: /copy scrubbed output/i,
    });

    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(clipboard.copyText).toHaveBeenCalledWith("SECRET=\n");
    expect(screen.getByText("Copied!")).toBeInTheDocument();
  });

  it("displays diagnostics and review warning when input contains invalid lines without showing safe indicator", () => {
    renderEnvScrubber();

    const inputArea = screen.getByLabelText(
      /input environment variables/i
    ) as HTMLTextAreaElement;

    fireEvent.change(inputArea, {
      target: { value: "VALID=1\nTHIS IS INVALID\nANOTHER=2\n" },
    });

    // Must NOT show safe to share indicator
    expect(screen.queryByText("Safe to share")).not.toBeInTheDocument();

    // Must show review needed badge
    expect(screen.getByText(/1 line needs review/i)).toBeInTheDocument();
    expect(screen.getByText(/Review Needed \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText("Line 2")).toBeInTheDocument();
    expect(
      screen.getByText(/Unrecognized or invalid assignment syntax on line 2/i)
    ).toBeInTheDocument();
  });

  it("displays error banner and prevents processing when input exceeds 1 MiB", () => {
    renderEnvScrubber();

    const inputArea = screen.getByLabelText(
      /input environment variables/i
    ) as HTMLTextAreaElement;

    const oversized = "A".repeat(MAX_ENV_INPUT_BYTES + 10);
    fireEvent.change(inputArea, { target: { value: oversized } });

    expect(
      screen.getByText(/Input exceeds maximum allowed size of 1 MiB/i)
    ).toBeInTheDocument();

    const outputArea = screen.getByLabelText(
      /redacted environment output/i
    ) as HTMLTextAreaElement;
    expect(outputArea.value).toBe("");
    expect(
      screen.getByRole("button", { name: /copy scrubbed output/i })
    ).toBeDisabled();
  });
});
