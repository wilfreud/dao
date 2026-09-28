import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { PortInspectorPage } from "./PortInspectorPage";
import * as api from "./api";
import * as clipboard from "../../foundation/clipboard";
import type {
  InspectPortResult,
  TerminateProcessResult,
} from "../../contracts/port-inspector";

vi.mock("./api");
vi.mock("../../foundation/clipboard");

const mockSingleOwnerResult: InspectPortResult = {
  port: 3000,
  sockets: [
    {
      protocol: "tcp",
      addressFamily: "ipv4",
      localAddress: "127.0.0.1",
      localPort: 3000,
      tcpState: "LISTEN",
      associatedPids: [81243],
    },
    {
      protocol: "tcp",
      addressFamily: "ipv6",
      localAddress: "::1",
      localPort: 3000,
      tcpState: "LISTEN",
      associatedPids: [81243],
    },
  ],
  owners: [
    {
      process: {
        pid: 81243,
        name: "node",
        executablePath: "/opt/homebrew/bin/node",
        command: ["node", "server.js"],
      },
      sockets: [
        {
          protocol: "tcp",
          addressFamily: "ipv4",
          localAddress: "127.0.0.1",
          localPort: 3000,
          tcpState: "LISTEN",
          associatedPids: [81243],
        },
        {
          protocol: "tcp",
          addressFamily: "ipv6",
          localAddress: "::1",
          localPort: 3000,
          tcpState: "LISTEN",
          associatedPids: [81243],
        },
      ],
    },
  ],
  unresolvedSocketCount: 0,
  inspectionCommands: [
    {
      label: "Check TCP listeners",
      command: "lsof -nP -iTCP:3000 -sTCP:LISTEN",
      requiresElevation: false,
    },
    {
      label: "Check TCP listeners (elevated)",
      command: "sudo lsof -nP -iTCP:3000 -sTCP:LISTEN",
      requiresElevation: true,
    },
  ],
};

const mockHiddenOwnerResult: InspectPortResult = {
  port: 80,
  sockets: [
    {
      protocol: "tcp",
      addressFamily: "ipv4",
      localAddress: "0.0.0.0",
      localPort: 80,
      tcpState: "LISTEN",
      associatedPids: [],
    },
  ],
  owners: [],
  unresolvedSocketCount: 1,
  inspectionCommands: [
    {
      label: "Check TCP listeners (elevated)",
      command: "sudo lsof -nP -iTCP:80 -sTCP:LISTEN",
      requiresElevation: true,
    },
  ],
};

function renderPortInspector() {
  return render(
    <MemoryRouter>
      <PortInspectorPage />
    </MemoryRouter>
  );
}

describe("PortInspectorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(clipboard.copyText).mockResolvedValue();
  });

  it("renders with initial port input and example badges", () => {
    renderPortInspector();

    expect(screen.getByLabelText(/local port/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /inspect/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3000" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "8080" })).toBeInTheDocument();
  });

  it("validates invalid port input and displays error message", () => {
    renderPortInspector();

    const input = screen.getByLabelText(/local port/i);
    fireEvent.change(input, { target: { value: "70000" } });

    fireEvent.click(screen.getByRole("button", { name: /inspect/i }));

    expect(
      screen.getByText(/Please enter a valid port between 1 and 65535/i)
    ).toBeInTheDocument();
    expect(api.inspectPort).not.toHaveBeenCalled();
  });

  it("inspects port and renders empty state when no sockets are listening", async () => {
    vi.mocked(api.inspectPort).mockResolvedValue({
      port: 4321,
      sockets: [],
      owners: [],
      unresolvedSocketCount: 0,
      inspectionCommands: [],
    });

    renderPortInspector();

    const input = screen.getByLabelText(/local port/i);
    fireEvent.change(input, { target: { value: "4321" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /inspect/i }));
    });

    expect(api.inspectPort).toHaveBeenCalledWith(4321);
    expect(
      await screen.findByText(/Nothing is listening on port 4321/i)
    ).toBeInTheDocument();
  });

  it("inspects port and renders sockets table and process owners preserving dual-stack", async () => {
    vi.mocked(api.inspectPort).mockResolvedValue(mockSingleOwnerResult);

    renderPortInspector();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /inspect/i }));
    });

    expect(await screen.findByText("Port 3000 Sockets & Process Owners")).toBeInTheDocument();
    expect(screen.getByText("127.0.0.1:3000")).toBeInTheDocument();
    expect(screen.getByText("::1:3000")).toBeInTheDocument();
    expect(screen.getByText("node")).toBeInTheDocument();
    expect(screen.getByText("PID 81243")).toBeInTheDocument();
    expect(screen.getByText("/opt/homebrew/bin/node")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /kill process/i })).toBeInTheDocument();
  });

  it("requires explicit confirmation before terminating process and calls terminatePortProcess", async () => {
    vi.mocked(api.inspectPort).mockResolvedValue(mockSingleOwnerResult);
    const mockTermResult: TerminateProcessResult = {
      pid: 81243,
      signalAttempted: "term",
      signalSent: true,
      stillRunning: false,
      terminationCommands: [],
    };
    vi.mocked(api.terminatePortProcess).mockResolvedValue(mockTermResult);

    renderPortInspector();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /inspect/i }));
    });

    const killBtn = await screen.findByRole("button", { name: /kill process/i });
    await act(async () => {
      fireEvent.click(killBtn);
    });

    // Check confirmation surface
    expect(screen.getByText(/Confirm termination of node \(PID 81243\)\?/i)).toBeInTheDocument();
    const confirmBtn = screen.getByRole("button", { name: /confirm kill/i });

    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(api.terminatePortProcess).toHaveBeenCalledWith({
      pid: 81243,
      portContext: 3000,
      mode: "graceful",
    });
  });

  it("displays force kill button and termination guidance if process is still running", async () => {
    vi.mocked(api.inspectPort).mockResolvedValue(mockSingleOwnerResult);
    const mockTermResult: TerminateProcessResult = {
      pid: 81243,
      signalAttempted: "term",
      signalSent: true,
      stillRunning: true, // Still alive!
      terminationCommands: [
        {
          label: "Terminate PID 81243",
          command: "kill -TERM 81243",
          requiresElevation: false,
        },
        {
          label: "Force kill PID 81243 (elevated)",
          command: "sudo kill -KILL 81243",
          requiresElevation: true,
        },
      ],
    };
    vi.mocked(api.terminatePortProcess).mockResolvedValue(mockTermResult);

    renderPortInspector();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /inspect/i }));
    });

    await act(async () => {
      fireEvent.click(await screen.findByRole("button", { name: /kill process/i }));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /confirm kill/i }));
    });

    // Verify force kill button appears
    expect(await screen.findByRole("button", { name: /force kill/i })).toBeInTheDocument();

    // Verify termination manual guidance appears
    expect(screen.getByText(/Could not terminate PID 81243/i)).toBeInTheDocument();
    expect(screen.getByText(/\$ kill -TERM 81243/i)).toBeInTheDocument();

    // Test Copy button on command
    const copyBtns = screen.getAllByRole("button", { name: /copy/i });
    await act(async () => {
      fireEvent.click(copyBtns[copyBtns.length - 1]);
    });
    expect(clipboard.copyText).toHaveBeenCalled();
  });

  it("displays manual inspection commands when owner is hidden", async () => {
    vi.mocked(api.inspectPort).mockResolvedValue(mockHiddenOwnerResult);

    renderPortInspector();

    const input = screen.getByLabelText(/local port/i);
    fireEvent.change(input, { target: { value: "80" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /inspect/i }));
    });

    expect(
      await screen.findByText(/Owner PID is not visible to the current process/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/\$ sudo lsof -nP -iTCP:80 -sTCP:LISTEN/i)).toBeInTheDocument();
  });
});
