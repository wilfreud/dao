import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QrGeneratorPage } from "./QrGeneratorPage";
import * as qrGen from "./qr-generator";
import * as clipboard from "../../foundation/clipboard";

vi.mock("./qr-generator", async () => {
  const actual = await vi.importActual<typeof import("./qr-generator")>(
    "./qr-generator"
  );
  return {
    ...actual,
    generateQrCode: vi.fn(),
  };
});

vi.mock("../../foundation/clipboard", () => ({
  copyText: vi.fn(),
  copyImage: vi.fn(),
}));

const mockQrResult = {
  svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M0 0h100v100H0z"/></svg>',
  pngDataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
};

describe("QrGeneratorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it("renders empty preview state initially", () => {
    render(
      <MemoryRouter>
        <QrGeneratorPage />
      </MemoryRouter>
    );

    expect(screen.getByText("QR Generator")).toBeInTheDocument();
    expect(
      screen.getByText("Enter text to generate a QR code.")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Copy QR code as image")).toBeDisabled();
    expect(screen.getByLabelText("Copy QR code SVG source text")).toBeDisabled();
    expect(screen.getByLabelText("Copy input text")).toBeDisabled();
    expect(screen.getByLabelText("Clear input")).toBeDisabled();
  });

  it("debounces and triggers generation when typing valid input", async () => {
    vi.mocked(qrGen.generateQrCode).mockResolvedValue(mockQrResult);

    render(
      <MemoryRouter>
        <QrGeneratorPage />
      </MemoryRouter>
    );

    const textarea = screen.getByLabelText("QR code input content");
    fireEvent.change(textarea, { target: { value: "https://example.com" } });

    // Not yet called immediately
    expect(qrGen.generateQrCode).not.toHaveBeenCalled();

    // Fast-forward past debounce timer
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(qrGen.generateQrCode).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({
        errorCorrectionLevel: "M",
        width: 512,
        margin: 4,
      })
    );

    expect(screen.getByTestId("qr-preview-container")).toBeInTheDocument();
  });

  it("regenerates when options change", async () => {
    vi.mocked(qrGen.generateQrCode).mockResolvedValue(mockQrResult);

    render(
      <MemoryRouter>
        <QrGeneratorPage />
      </MemoryRouter>
    );

    const textarea = screen.getByLabelText("QR code input content");
    fireEvent.change(textarea, { target: { value: "https://example.com" } });

    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(qrGen.generateQrCode).toHaveBeenCalledTimes(1);

    // Change error correction level to H
    const radioH = screen.getByRole("radio", { name: "H" });
    fireEvent.click(radioH);

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(qrGen.generateQrCode).toHaveBeenLastCalledWith(
      "https://example.com",
      expect.objectContaining({
        errorCorrectionLevel: "H",
        width: 512,
        margin: 4,
      })
    );
  });

  it("prevents stale async generation results from replacing newer input", async () => {
    let resolveFirst!: (val: typeof mockQrResult) => void;
    const firstPromise = new Promise<typeof mockQrResult>((resolve) => {
      resolveFirst = resolve;
    });

    const secondResult = {
      svg: '<svg id="second-result"></svg>',
      pngDataUrl: "data:image/png;base64,second",
    };

    vi.mocked(qrGen.generateQrCode)
      .mockReturnValueOnce(firstPromise)
      .mockResolvedValueOnce(secondResult);

    render(
      <MemoryRouter>
        <QrGeneratorPage />
      </MemoryRouter>
    );

    const textarea = screen.getByLabelText("QR code input content");

    // First input
    fireEvent.change(textarea, { target: { value: "first input" } });
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Second input before first resolves
    fireEvent.change(textarea, { target: { value: "second input" } });
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Now resolve the first (stale) call
    await act(async () => {
      resolveFirst(mockQrResult);
    });

    // The container should display the second result, not the stale first result
    const container = screen.getByTestId("qr-preview-container");
    expect(container.innerHTML).toContain('id="second-result"');
  });

  it("copies input text on Copy text button click", async () => {
    render(
      <MemoryRouter>
        <QrGeneratorPage />
      </MemoryRouter>
    );

    const textarea = screen.getByLabelText("QR code input content");
    fireEvent.change(textarea, { target: { value: "my secret link" } });

    const copyTextBtn = screen.getByLabelText("Copy input text");
    await act(async () => {
      fireEvent.click(copyTextBtn);
    });

    expect(clipboard.copyText).toHaveBeenCalledWith("my secret link");
  });

  it("copies SVG source on Copy SVG button click", async () => {
    vi.mocked(qrGen.generateQrCode).mockResolvedValue(mockQrResult);

    render(
      <MemoryRouter>
        <QrGeneratorPage />
      </MemoryRouter>
    );

    const textarea = screen.getByLabelText("QR code input content");
    fireEvent.change(textarea, { target: { value: "sample data" } });

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    const copySvgBtn = screen.getByLabelText("Copy QR code SVG source text");
    await act(async () => {
      fireEvent.click(copySvgBtn);
    });

    expect(clipboard.copyText).toHaveBeenCalledWith(mockQrResult.svg);
  });

  it("copies image buffer on Copy image button click and handles failure gracefully", async () => {
    vi.mocked(qrGen.generateQrCode).mockResolvedValue(mockQrResult);
    vi.mocked(clipboard.copyImage).mockRejectedValue(
      new Error("Tauri clipboard image denied")
    );

    render(
      <MemoryRouter>
        <QrGeneratorPage />
      </MemoryRouter>
    );

    const textarea = screen.getByLabelText("QR code input content");
    fireEvent.change(textarea, { target: { value: "sample data" } });

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    const copyImageBtn = screen.getByLabelText("Copy QR code as image");
    await act(async () => {
      fireEvent.click(copyImageBtn);
    });

    expect(clipboard.copyImage).toHaveBeenCalledTimes(1);
    // Failure notice appears without wiping the preview
    expect(
      screen.getByText(/Failed to copy image: Tauri clipboard image denied/)
    ).toBeInTheDocument();
    expect(screen.getByTestId("qr-preview-container")).toBeInTheDocument();
  });

  it("clears input, preview and errors on Clear button click", async () => {
    vi.mocked(qrGen.generateQrCode).mockResolvedValue(mockQrResult);

    render(
      <MemoryRouter>
        <QrGeneratorPage />
      </MemoryRouter>
    );

    const textarea = screen.getByLabelText("QR code input content");
    fireEvent.change(textarea, { target: { value: "some input" } });

    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByTestId("qr-preview-container")).toBeInTheDocument();

    const clearBtn = screen.getByLabelText("Clear input");
    await act(async () => {
      fireEvent.click(clearBtn);
    });

    expect(textarea).toHaveValue("");
    expect(
      screen.getByText("Enter text to generate a QR code.")
    ).toBeInTheDocument();
  });
});
