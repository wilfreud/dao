import { useState, type FormEvent } from "react";
import {
  Search,
  RefreshCw,
  AlertTriangle,
  Copy,
  Check,
  ShieldAlert,
  Server,
  Terminal,
  Skull,
} from "lucide-react";
import { ToolPageHeader } from "../../foundation/ui";
import { copyText } from "../../foundation/clipboard";
import { portInspectorManifest } from "./manifest";
import { inspectPort, terminatePortProcess } from "./api";
import type {
  InspectPortResult,
  ProcessOwner,
  TerminateProcessResult,
} from "../../contracts/port-inspector";
import type { AppCommandError } from "../../contracts/errors";

type PortInspectorState =
  | { status: "idle" }
  | { status: "inspecting"; port: number }
  | { status: "ready"; result: InspectPortResult }
  | { status: "empty"; port: number }
  | { status: "terminating"; result: InspectPortResult; pid: number }
  | { status: "error"; port?: number; message: string };

export function PortInspectorPage() {
  const [portInput, setPortInput] = useState<string>("3000");
  const [state, setState] = useState<PortInspectorState>({ status: "idle" });
  const [confirmPid, setConfirmPid] = useState<number | null>(null);
  const [forceKillAvailable, setForceKillAvailable] = useState<Record<number, boolean>>({});
  const [terminationResult, setTerminationResult] = useState<TerminateProcessResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleCopy = async (text: string, id: string) => {
    try {
      await copyText(text);
      setCopiedIndex(id);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const executeInspection = async (port: number) => {
    setValidationError(null);
    setConfirmPid(null);
    setTerminationResult(null);
    setState({ status: "inspecting", port });

    try {
      const result = await inspectPort(port);
      if (result.sockets.length === 0) {
        setState({ status: "empty", port });
      } else {
        setState({ status: "ready", result });
      }
    } catch (err: unknown) {
      const cmdErr = err as AppCommandError;
      setState({
        status: "error",
        port,
        message: cmdErr.message || "Failed to inspect port",
      });
    }
  };

  const handleInspectSubmit = (e: FormEvent) => {
    e.preventDefault();
    const portNum = parseInt(portInput.trim(), 10);
    if (Number.isNaN(portNum) || portNum < 1 || portNum > 65535) {
      setValidationError("Please enter a valid port between 1 and 65535.");
      return;
    }
    void executeInspection(portNum);
  };

  const handleExampleClick = (port: number) => {
    setPortInput(port.toString());
    void executeInspection(port);
  };

  const handleTerminate = async (pid: number, portContext: number, force: boolean) => {
    if (state.status !== "ready" && state.status !== "terminating") return;
    const currentResult = state.result;

    setState({ status: "terminating", result: currentResult, pid });
    setConfirmPid(null);

    try {
      const res = await terminatePortProcess({
        pid,
        portContext,
        mode: force ? "force" : "graceful",
      });
      setTerminationResult(res);

      if (res.stillRunning) {
        // Mark force kill as justified/available for this PID
        setForceKillAvailable((prev) => ({ ...prev, [pid]: true }));
      } else {
        // Process is terminated! Remove force kill option and re-inspect port
        setForceKillAvailable((prev) => {
          const next = { ...prev };
          delete next[pid];
          return next;
        });
        setTimeout(() => {
          void executeInspection(portContext);
        }, 300);
      }
      setState({ status: "ready", result: currentResult });
    } catch (err: unknown) {
      const cmdErr = err as AppCommandError;
      setState({
        status: "error",
        port: portContext,
        message: cmdErr.message || `Failed to terminate process ${pid}`,
      });
    }
  };

  const activePort =
    state.status === "inspecting" || state.status === "empty"
      ? state.port
      : state.status === "ready" || state.status === "terminating"
        ? state.result.port
        : state.status === "error"
          ? state.port
          : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-app)]">
      <ToolPageHeader
        title={portInspectorManifest.name}
        category={portInspectorManifest.category}
      />

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Search / Port Input Form */}
        <section className="p-6 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col gap-4">
          <form onSubmit={handleInspectSubmit} noValidate className="flex flex-col gap-3">
            <label
              htmlFor="port-input"
              className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider"
            >
              Local Port
            </label>
            <div className="flex items-center gap-3">
              <input
                id="port-input"
                type="number"
                min={1}
                max={65535}
                value={portInput}
                onChange={(e) => {
                  setPortInput(e.target.value);
                  setValidationError(null);
                }}
                placeholder="e.g. 3000"
                className="flex-1 px-3 py-2 text-sm font-mono rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-app)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
              <button
                type="submit"
                disabled={state.status === "inspecting"}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-[var(--radius-sm)] bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 cursor-pointer transition-colors shrink-0"
              >
                {state.status === "inspecting" ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Inspecting...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Inspect</span>
                  </>
                )}
              </button>
            </div>
            {validationError && (
              <span className="text-xs text-[var(--danger)]">
                {validationError}
              </span>
            )}
          </form>

          {/* Quick Examples */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)] pt-1">
            <span>Examples:</span>
            {[3000, 5000, 5432, 8080].map((examplePort) => (
              <button
                key={examplePort}
                type="button"
                onClick={() => handleExampleClick(examplePort)}
                className="px-2 py-0.5 rounded font-mono border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
              >
                {examplePort}
              </button>
            ))}
          </div>
        </section>

        {/* Error Display */}
        {state.status === "error" && (
          <div
            role="alert"
            className="p-4 rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--danger-subtle)] text-[var(--danger)] text-xs flex items-center justify-between"
          >
            <span>{state.message}</span>
            <button
              type="button"
              onClick={() => setState({ status: "idle" })}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Empty State */}
        {state.status === "empty" && (
          <section className="p-8 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-center flex flex-col items-center gap-3">
            <Server className="w-8 h-8 text-[var(--text-muted)]" />
            <h2 className="text-sm font-medium text-[var(--text-primary)]">
              Nothing is listening on port {state.port}.
            </h2>
            <p className="text-xs text-[var(--text-secondary)] max-w-sm">
              The port is currently free and available for local servers or applications to bind.
            </p>
            <button
              type="button"
              onClick={() => executeInspection(state.port)}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </section>
        )}

        {/* Results State */}
        {(state.status === "ready" || state.status === "terminating") && (
          <div className="flex flex-col gap-6">
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <span>Port {activePort} Sockets & Process Owners</span>
              </h2>
              <button
                type="button"
                onClick={() => activePort && executeInspection(activePort)}
                disabled={state.status === "terminating"}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] rounded border border-[var(--border-subtle)] cursor-pointer disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${state.status === "terminating" ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Sockets Table */}
            <section className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Listening Sockets ({state.result.sockets.length})
              </div>
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                    <th className="py-2 px-4 font-medium">Protocol</th>
                    <th className="py-2 px-4 font-medium">Family</th>
                    <th className="py-2 px-4 font-medium">Local Address</th>
                    <th className="py-2 px-4 font-medium">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {state.result.sockets.map((socket, index) => (
                    <tr key={index} className="hover:bg-[var(--bg-surface-hover)]">
                      <td className="py-2 px-4 uppercase text-[var(--accent)] font-semibold">
                        {socket.protocol}
                      </td>
                      <td className="py-2 px-4 uppercase text-[var(--text-secondary)]">
                        {socket.addressFamily}
                      </td>
                      <td className="py-2 px-4 text-[var(--text-primary)]">
                        {socket.localAddress}:{socket.localPort}
                      </td>
                      <td className="py-2 px-4 text-[var(--success)]">
                        {socket.tcpState || "BOUND"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* Process Owners */}
            <section className="flex flex-col gap-4">
              <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Process Owners ({state.result.owners.length})
              </div>

              {state.result.owners.map((owner: ProcessOwner) => {
                const pid = owner.process.pid;
                const isConfirming = confirmPid === pid;
                const canForce = forceKillAvailable[pid];

                return (
                  <div
                    key={pid}
                    className="p-5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col gap-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[var(--text-primary)]">
                            {owner.process.name || "Unknown Process"}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                            PID {pid}
                          </span>
                        </div>
                        {owner.process.executablePath && (
                          <span className="text-xs font-mono text-[var(--text-muted)] break-all">
                            {owner.process.executablePath}
                          </span>
                        )}
                      </div>

                      {/* Terminate Action / Confirm */}
                      {!isConfirming ? (
                        <div className="flex items-center gap-2 shrink-0">
                          {canForce ? (
                            <button
                              type="button"
                              onClick={() => setConfirmPid(pid)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[var(--radius-sm)] border border-[var(--danger)] bg-[var(--danger)] text-white hover:opacity-90 cursor-pointer transition-colors"
                            >
                              <Skull className="w-3.5 h-3.5" />
                              <span>Force kill</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmPid(pid)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[var(--radius-sm)] border border-[var(--danger)] bg-[var(--danger-subtle)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white cursor-pointer transition-colors"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>Kill process</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div
                          aria-label="Confirm termination"
                          className="p-3 rounded border border-[var(--danger)] bg-[var(--danger-subtle)] flex flex-col sm:flex-row items-center gap-3 shrink-0"
                        >
                          <div className="text-xs text-[var(--danger)] font-medium">
                            Confirm termination of {owner.process.name || "process"} (PID {pid})?
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setConfirmPid(null)}
                              className="px-2.5 py-1 text-xs rounded border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTerminate(pid, state.result.port, !!canForce)}
                              className="px-2.5 py-1 text-xs font-medium rounded bg-[var(--danger)] text-white hover:opacity-90 cursor-pointer"
                            >
                              {canForce ? "Confirm Force Kill" : "Confirm Kill"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>

            {/* Termination Denied / Failed Guidance */}
            {terminationResult && terminationResult.stillRunning && (
              <section
                aria-label="Termination manual guidance"
                className="p-4 rounded-[var(--radius-md)] border border-[var(--warning)] bg-[var(--warning-subtle)] flex flex-col gap-3"
              >
                <div className="flex items-start gap-2.5 text-xs text-[var(--warning)] font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">
                      Could not terminate PID {terminationResult.pid}.
                    </p>
                    <p className="text-[var(--text-secondary)] font-normal mt-0.5">
                      The process may belong to another user or require elevated privileges. Try running the manual command below:
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  {terminationResult.terminationCommands.map((cmd, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-2.5 rounded bg-[var(--bg-app)] border border-[var(--border-default)] text-xs font-mono"
                    >
                      <span className="text-[var(--text-primary)] truncate select-all">
                        $ {cmd.command}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(cmd.command, `term-${idx}`)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors shrink-0"
                      >
                        {copiedIndex === `term-${idx}` ? (
                          <>
                            <Check className="w-3 h-3 text-[var(--success)]" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Unresolved Owner Guidance */}
            {(state.result.unresolvedSocketCount > 0 || state.result.owners.length === 0) && (
              <section
                aria-label="Owner hidden manual guidance"
                className="p-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col gap-3"
              >
                <div className="flex items-start gap-2.5 text-xs text-[var(--text-secondary)]">
                  <Terminal className="w-4 h-4 shrink-0 mt-0.5 text-[var(--text-muted)]" />
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">
                      Owner PID is not visible to the current process.
                    </p>
                    <p className="text-[var(--text-muted)] mt-0.5">
                      System-owned or elevated sockets hide process ownership from standard users. Run an inspection command manually:
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  {state.result.inspectionCommands.map((cmd, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-2.5 rounded bg-[var(--bg-app)] border border-[var(--border-default)] text-xs font-mono"
                    >
                      <span className="text-[var(--text-primary)] truncate select-all">
                        $ {cmd.command}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(cmd.command, `inspect-${idx}`)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors shrink-0"
                      >
                        {copiedIndex === `inspect-${idx}` ? (
                          <>
                            <Check className="w-3 h-3 text-[var(--success)]" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
