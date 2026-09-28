import { useState, useEffect, useCallback } from "react";
import {
  Copy,
  Check,
  Folder,
  Play,
  Square,
  AlertTriangle,
  FileText,
  CheckCircle2,
  XCircle,
  Radio,
} from "lucide-react";
import { ToolPageHeader } from "../../foundation/ui";
import { copyText } from "../../foundation/clipboard";
import { dropServerManifest } from "./manifest";
import {
  listEligibleNetworkInterfaces,
  getDropServerStatus,
  startDropServer,
  stopDropServer,
  selectDestinationFolder,
  subscribeToDropServerEvents,
} from "./api";
import { formatBytes, formatTime } from "./formatters";
import type {
  DropServerSnapshot,
  NetworkInterfaceDto,
  PortSelection,
} from "../../contracts/drop-server";
import type { AppCommandError } from "../../contracts/errors";

export function DropServerPage() {
  const [interfaces, setInterfaces] = useState<readonly NetworkInterfaceDto[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [portMode, setPortMode] = useState<"fixed" | "auto">("fixed");
  const [fixedPort, setFixedPort] = useState<number>(8090);
  const [destinationPath, setDestinationPath] = useState<string>("");

  const [snapshot, setSnapshot] = useState<DropServerSnapshot>({
    lifecycle: "stopped",
    bindAddress: null,
    port: null,
    destinationPath: null,
    startedAtEpochMs: null,
    recentUploads: [],
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const refreshStatus = useCallback(async () => {
    try {
      const current = await getDropServerStatus();
      setSnapshot(current);
      if (current.lifecycle === "running") {
        if (current.bindAddress) setSelectedAddress(current.bindAddress);
        if (current.destinationPath) setDestinationPath(current.destinationPath);
        if (current.port) {
          setPortMode("fixed");
          setFixedPort(current.port);
        }
      }
    } catch (err) {
      console.error("Failed to query drop server status:", err);
    }
  }, []);

  // Initialize status, interfaces, and event listeners
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let isMounted = true;

    async function init() {
      setIsLoading(true);
      try {
        const [ifaces, status] = await Promise.all([
          listEligibleNetworkInterfaces().catch(() => [] as NetworkInterfaceDto[]),
          getDropServerStatus().catch(() => null),
        ]);

        if (!isMounted) return;

        setInterfaces(ifaces);
        if (status) {
          setSnapshot(status);
          if (status.lifecycle === "running") {
            if (status.bindAddress) setSelectedAddress(status.bindAddress);
            if (status.destinationPath) setDestinationPath(status.destinationPath);
            if (status.port) setFixedPort(status.port);
          } else if (ifaces.length > 0) {
            const recommended = ifaces.find((i) => i.isRecommended);
            setSelectedAddress(recommended ? recommended.address : ifaces[0].address);
          }
        } else if (ifaces.length > 0) {
          const recommended = ifaces.find((i) => i.isRecommended);
          setSelectedAddress(recommended ? recommended.address : ifaces[0].address);
        }

        unlisten = await subscribeToDropServerEvents({
          onUploadCompleted: () => {
            void refreshStatus();
          },
          onUploadFailed: () => {
            void refreshStatus();
          },
          onStoppedUnexpectedly: () => {
            void refreshStatus();
          },
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void init();

    return () => {
      isMounted = false;
      if (unlisten) {
        unlisten();
      }
    };
  }, [refreshStatus]);

  const handleChooseFolder = async () => {
    try {
      const selected = await selectDestinationFolder();
      if (selected) {
        setDestinationPath(selected);
        setErrorMessage(null);
      }
    } catch (err) {
      console.error("Failed to select folder:", err);
    }
  };

  const isFixedPortValid =
    portMode === "auto" ||
    (!Number.isNaN(fixedPort) && fixedPort >= 1024 && fixedPort <= 65535);

  const isRunning = snapshot.lifecycle === "running";
  const isTransitioning =
    snapshot.lifecycle === "starting" ||
    snapshot.lifecycle === "stopping" ||
    isActionLoading;

  const handleStart = async () => {
    if (!selectedAddress || !destinationPath || !isFixedPortValid) {
      return;
    }

    setErrorMessage(null);
    setIsActionLoading(true);

    const portSelection: PortSelection =
      portMode === "auto" ? { mode: "auto" } : { mode: "fixed", port: fixedPort };

    try {
      const newSnapshot = await startDropServer({
        bindAddress: selectedAddress,
        destinationPath,
        port: portSelection,
      });
      setSnapshot(newSnapshot);
    } catch (err: unknown) {
      const commandError = err as AppCommandError;
      setErrorMessage(
        commandError.message ||
          (commandError.code ? `Error: ${commandError.code}` : "Failed to start drop server")
      );
      void refreshStatus();
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStop = async () => {
    setErrorMessage(null);
    setIsActionLoading(true);

    try {
      const newSnapshot = await stopDropServer();
      setSnapshot(newSnapshot);
    } catch (err: unknown) {
      const commandError = err as AppCommandError;
      setErrorMessage(
        commandError.message ||
          (commandError.code ? `Error: ${commandError.code}` : "Failed to stop drop server")
      );
      void refreshStatus();
    } finally {
      setIsActionLoading(false);
    }
  };

  const runningUrl =
    isRunning && snapshot.bindAddress && snapshot.port
      ? `http://${snapshot.bindAddress}:${snapshot.port}/`
      : null;

  const handleCopyUrl = async () => {
    if (!runningUrl) return;
    try {
      await copyText(runningUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-app)]">
      <ToolPageHeader
        title={dropServerManifest.name}
        category={dropServerManifest.category}
      />

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Security Notice Banner */}
        <div className="flex items-start gap-3 p-3.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-secondary)]">
          <AlertTriangle className="w-4 h-4 text-[var(--warning)] shrink-0 mt-0.5" />
          <p>
            Notice: Anyone reachable on this local network can upload files to your
            designated destination while the server is active.
          </p>
        </div>

        {/* Configuration Surface */}
        <section className="p-6 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col gap-5">
          {/* Network Interface Selection */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="interface-select"
              className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
            >
              Network Interface
            </label>
            <select
              id="interface-select"
              disabled={isRunning || isTransitioning || isLoading}
              value={selectedAddress}
              onChange={(e) => setSelectedAddress(e.target.value)}
              className="px-3 py-2 text-sm font-mono rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-app)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {interfaces.length === 0 ? (
                <option value="">
                  {isLoading
                    ? "Detecting network interfaces..."
                    : "No eligible IPv4 interfaces found"}
                </option>
              ) : (
                interfaces.map((iface) => (
                  <option key={iface.address} value={iface.address}>
                    {iface.name} · {iface.address}
                    {iface.isRecommended ? " (Recommended)" : ""}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Port Selection */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              Port
            </span>
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <label className="flex items-center gap-2 cursor-pointer text-[var(--text-primary)]">
                <input
                  type="radio"
                  name="portMode"
                  value="fixed"
                  checked={portMode === "fixed"}
                  disabled={isRunning || isTransitioning}
                  onChange={() => setPortMode("fixed")}
                  className="accent-[var(--accent)]"
                />
                <span>Fixed Port</span>
                {portMode === "fixed" && (
                  <input
                    type="number"
                    min={1024}
                    max={65535}
                    value={fixedPort}
                    disabled={isRunning || isTransitioning}
                    onChange={(e) => setFixedPort(parseInt(e.target.value, 10))}
                    aria-label="Fixed port number"
                    className="w-24 px-2 py-1 text-sm font-mono rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-app)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
                  />
                )}
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-[var(--text-primary)]">
                <input
                  type="radio"
                  name="portMode"
                  value="auto"
                  checked={portMode === "auto"}
                  disabled={isRunning || isTransitioning}
                  onChange={() => setPortMode("auto")}
                  className="accent-[var(--accent)]"
                />
                <span className="flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  Auto (OS assigned)
                </span>
              </label>
            </div>
            {portMode === "fixed" && !isFixedPortValid && (
              <span className="text-xs text-[var(--danger)]">
                Port must be an integer between 1024 and 65535.
              </span>
            )}
          </div>

          {/* Destination Folder */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="destination-input"
              className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
            >
              Destination Folder
            </label>
            <div className="flex items-center gap-2">
              <input
                id="destination-input"
                type="text"
                readOnly
                placeholder="Choose destination folder on disk..."
                value={destinationPath}
                className="flex-1 px-3 py-2 text-sm font-mono rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-app)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleChooseFolder}
                disabled={isRunning || isTransitioning}
                aria-label="Choose destination folder"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                <Folder className="w-3.5 h-3.5" />
                <span>Choose...</span>
              </button>
            </div>
          </div>

          {/* Action Row & Lifecycle */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
            <div className="flex items-center gap-3">
              {isRunning ? (
                <button
                  type="button"
                  onClick={handleStop}
                  disabled={isTransitioning}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-[var(--radius-sm)] border border-[var(--danger)] bg-[var(--danger-subtle)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-colors"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>{isTransitioning ? "Stopping..." : "Stop Server"}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={
                    !selectedAddress ||
                    !destinationPath ||
                    !isFixedPortValid ||
                    isTransitioning ||
                    isLoading
                  }
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-[var(--radius-sm)] bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isTransitioning ? "Starting..." : "Start Server"}</span>
                </button>
              )}

              {/* Status Badge */}
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isRunning
                      ? "bg-[var(--success)] animate-pulse"
                      : isTransitioning
                        ? "bg-[var(--warning)]"
                        : "bg-[var(--text-muted)]"
                  }`}
                />
                <span className="capitalize font-mono">
                  {snapshot.lifecycle}
                </span>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div
              role="alert"
              className="p-3 text-xs rounded-[var(--radius-sm)] border border-[var(--danger)] bg-[var(--danger-subtle)] text-[var(--danger)] flex items-center justify-between"
            >
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
        </section>

        {/* Running Focal Point: URL Display + Copy */}
        {isRunning && runningUrl && (
          <section
            aria-label="Running server details"
            className="p-6 rounded-[var(--radius-md)] border border-[var(--accent)] bg-[var(--accent-subtle)] flex flex-col gap-3"
          >
            <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              Drop Server Active — Send Files To:
            </span>
            <div className="flex items-center justify-between gap-4 p-3 rounded-[var(--radius-sm)] bg-[var(--bg-app)] border border-[var(--border-default)]">
              <span className="text-base sm:text-lg font-mono font-medium text-[var(--text-primary)] break-all select-all">
                {runningUrl}
              </span>
              <button
                type="button"
                onClick={handleCopyUrl}
                aria-label="Copy server URL"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[var(--radius-sm)] bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] cursor-pointer transition-colors shrink-0"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy URL</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Open this link on any device connected to the same LAN to upload files.
            </p>
          </section>
        )}

        {/* Recent Uploads Section */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              <span>Recent Uploads</span>
              {snapshot.recentUploads.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                  {snapshot.recentUploads.length}
                </span>
              )}
            </h2>
          </div>

          {snapshot.recentUploads.length === 0 ? (
            <div className="p-6 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-center text-xs text-[var(--text-muted)]">
              No files received yet during this session.
            </div>
          ) : (
            <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                    <th className="py-2.5 px-4 font-medium">File Name</th>
                    <th className="py-2.5 px-4 font-medium">Size</th>
                    <th className="py-2.5 px-4 font-medium">Time</th>
                    <th className="py-2.5 px-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {snapshot.recentUploads.map((record) => (
                    <tr
                      key={record.uploadId}
                      className="hover:bg-[var(--bg-surface-hover)] transition-colors"
                    >
                      <td className="py-2 px-4 font-mono text-[var(--text-primary)] truncate max-w-[200px] sm:max-w-xs" title={record.fileName}>
                        {record.fileName}
                      </td>
                      <td className="py-2 px-4 font-mono text-[var(--text-secondary)] whitespace-nowrap">
                        {formatBytes(record.sizeBytes)}
                      </td>
                      <td className="py-2 px-4 font-mono text-[var(--text-secondary)] whitespace-nowrap">
                        {formatTime(record.receivedAtEpochMs)}
                      </td>
                      <td className="py-2 px-4 whitespace-nowrap">
                        {record.outcome === "completed" ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-[var(--success-subtle)] text-[var(--success)]">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-[var(--danger-subtle)] text-[var(--danger)]"
                            title={record.errorCode}
                          >
                            <XCircle className="w-3 h-3" />
                            Failed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
