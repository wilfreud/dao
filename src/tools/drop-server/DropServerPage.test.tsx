import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { DropServerPage } from "./DropServerPage";
import * as api from "./api";
import * as clipboard from "../../foundation/clipboard";
import type { DropServerSnapshot, NetworkInterfaceDto } from "../../contracts/drop-server";

vi.mock("./api");
vi.mock("../../foundation/clipboard");

const mockInterfaces: NetworkInterfaceDto[] = [
  {
    name: "en0",
    address: "192.168.1.100",
    isPrivate: true,
    isRecommended: true,
  },
  {
    name: "en1",
    address: "10.0.0.5",
    isPrivate: true,
    isRecommended: false,
  },
];

const mockStoppedSnapshot: DropServerSnapshot = {
  lifecycle: "stopped",
  bindAddress: null,
  port: null,
  destinationPath: null,
  startedAtEpochMs: null,
  recentUploads: [],
};

const mockRunningSnapshot: DropServerSnapshot = {
  lifecycle: "running",
  bindAddress: "192.168.1.100",
  port: 8090,
  destinationPath: "/test/drop/dir",
  startedAtEpochMs: 1700000000000,
  recentUploads: [
    {
      uploadId: 1,
      fileName: "document.pdf",
      sizeBytes: 1048576,
      receivedAtEpochMs: 1700000001000,
      outcome: "completed",
    },
    {
      uploadId: 2,
      fileName: "failed.bin",
      sizeBytes: 500,
      receivedAtEpochMs: 1700000002000,
      outcome: "failed",
      errorCode: "MALFORMED_MULTIPART",
    },
  ],
};

describe("DropServerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.listEligibleNetworkInterfaces).mockResolvedValue(mockInterfaces);
    vi.mocked(api.getDropServerStatus).mockResolvedValue(mockStoppedSnapshot);
    vi.mocked(api.subscribeToDropServerEvents).mockResolvedValue(() => {});
    vi.mocked(clipboard.copyText).mockResolvedValue();
  });

  it("renders with stopped status and pre-selects recommended interface", async () => {
    render(
      <MemoryRouter>
        <DropServerPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/stopped/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start server/i })).toBeDisabled();

    // Check interface selector has recommended interface selected
    const select = screen.getByLabelText(/network interface/i) as HTMLSelectElement;
    expect(select.value).toBe("192.168.1.100");

    // Notice text should be displayed
    expect(
      screen.getByText(/anyone reachable on this local network can upload files/i)
    ).toBeInTheDocument();
  });

  it("enables Start Server when a folder is selected", async () => {
    vi.mocked(api.selectDestinationFolder).mockResolvedValue("/test/downloads");

    render(
      <MemoryRouter>
        <DropServerPage />
      </MemoryRouter>
    );

    await screen.findByText(/stopped/i);

    const chooseBtn = screen.getByRole("button", { name: /choose destination folder/i });
    await act(async () => {
      fireEvent.click(chooseBtn);
    });

    await waitFor(() => {
      const input = screen.getByPlaceholderText(/choose destination folder on disk/i) as HTMLInputElement;
      expect(input.value).toBe("/test/downloads");
    });

    const startBtn = screen.getByRole("button", { name: /start server/i });
    expect(startBtn).not.toBeDisabled();
  });

  it("starts the server and shows running state with URL and Copy button", async () => {
    vi.mocked(api.selectDestinationFolder).mockResolvedValue("/test/downloads");
    vi.mocked(api.startDropServer).mockResolvedValue(mockRunningSnapshot);

    render(
      <MemoryRouter>
        <DropServerPage />
      </MemoryRouter>
    );

    await screen.findByText(/stopped/i);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /choose destination folder/i }));
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /start server/i })).not.toBeDisabled();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /start server/i }));
    });

    expect(api.startDropServer).toHaveBeenCalledWith({
      bindAddress: "192.168.1.100",
      destinationPath: "/test/downloads",
      port: { mode: "fixed", port: 8090 },
    });

    expect(await screen.findByText(/running/i)).toBeInTheDocument();
    expect(screen.getByText("http://192.168.1.100:8090/")).toBeInTheDocument();

    // Test Copy button
    const copyBtn = screen.getByRole("button", { name: /copy server url/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });
    expect(clipboard.copyText).toHaveBeenCalledWith("http://192.168.1.100:8090/");
  });

  it("handles auto port mode", async () => {
    vi.mocked(api.selectDestinationFolder).mockResolvedValue("/test/downloads");
    vi.mocked(api.startDropServer).mockResolvedValue({
      ...mockRunningSnapshot,
      port: 54321,
    });

    render(
      <MemoryRouter>
        <DropServerPage />
      </MemoryRouter>
    );

    await screen.findByText(/stopped/i);

    // Switch to auto port
    const autoRadio = screen.getByLabelText(/auto/i);
    await act(async () => {
      fireEvent.click(autoRadio);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /choose destination folder/i }));
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /start server/i })).not.toBeDisabled();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /start server/i }));
    });

    expect(api.startDropServer).toHaveBeenCalledWith({
      bindAddress: "192.168.1.100",
      destinationPath: "/test/downloads",
      port: { mode: "auto" },
    });
  });

  it("stops the server when Stop Server button is clicked", async () => {
    vi.mocked(api.getDropServerStatus).mockResolvedValue(mockRunningSnapshot);
    vi.mocked(api.stopDropServer).mockResolvedValue(mockStoppedSnapshot);

    render(
      <MemoryRouter>
        <DropServerPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/running/i)).toBeInTheDocument();

    const stopBtn = screen.getByRole("button", { name: /stop server/i });
    await act(async () => {
      fireEvent.click(stopBtn);
    });

    expect(api.stopDropServer).toHaveBeenCalled();
    expect(await screen.findByText(/stopped/i)).toBeInTheDocument();
  });

  it("displays recent uploads in table", async () => {
    vi.mocked(api.getDropServerStatus).mockResolvedValue(mockRunningSnapshot);

    render(
      <MemoryRouter>
        <DropServerPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("document.pdf")).toBeInTheDocument();
    expect(screen.getByText("1 MB")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();

    expect(screen.getByText("failed.bin")).toBeInTheDocument();
    expect(screen.getByText("500 B")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("surfaces server start error in alert banner", async () => {
    vi.mocked(api.selectDestinationFolder).mockResolvedValue("/test/downloads");
    vi.mocked(api.startDropServer).mockRejectedValue({
      code: "PORT_IN_USE",
      message: "Port 8090 is already in use by another application.",
    });

    render(
      <MemoryRouter>
        <DropServerPage />
      </MemoryRouter>
    );

    await screen.findByText(/stopped/i);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /choose destination folder/i }));
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /start server/i })).not.toBeDisabled();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /start server/i }));
    });

    expect(
      await screen.findByText(/Port 8090 is already in use/i)
    ).toBeInTheDocument();
  });
});
