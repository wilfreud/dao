import { useState, useMemo, useEffect } from "react";
import {
  Copy,
  Check,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { ToolPageHeader } from "../../foundation/ui";
import { copyText } from "../../foundation/clipboard";
import { envScrubberManifest } from "./manifest";
import { scrubEnv } from "./scrubber";
import {
  MAX_ENV_INPUT_BYTES,
  type ScrubResult,
} from "../../contracts/env-scrubber";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
}

export function EnvScrubberPage() {
  const isMobile = useIsMobile();
  const [input, setInput] = useState<string>("");
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const byteLength = useMemo(() => {
    return new TextEncoder().encode(input).length;
  }, [input]);

  const isOversized = byteLength > MAX_ENV_INPUT_BYTES;

  const result: ScrubResult = useMemo(() => {
    if (!input || isOversized) {
      return { output: "", redactedAssignments: 0, diagnostics: [] };
    }
    try {
      return scrubEnv(input);
    } catch {
      return { output: "", redactedAssignments: 0, diagnostics: [] };
    }
  }, [input, isOversized]);

  const handleClear = () => {
    setInput("");
  };

  const handleCopy = async () => {
    if (!result.output) return;
    try {
      await copyText(result.output);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy scrubbed env:", err);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-app)] overflow-hidden">
      <ToolPageHeader
        title={envScrubberManifest.name}
        category={envScrubberManifest.category}
      />

      {/* Oversized Warning Banner */}
      {isOversized && (
        <div
          role="alert"
          className="mx-6 mt-4 p-3 rounded-[var(--radius-sm)] border border-[var(--danger)] bg-[var(--danger-subtle)] text-[var(--danger)] text-xs flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            Input exceeds maximum allowed size of 1 MiB ({byteLength.toLocaleString()}{" "}
            bytes). Content was not processed to prevent UI freezing.
          </span>
        </div>
      )}

      {/* Resizable Work Area */}
      <main className="flex-1 flex flex-col min-h-0 p-4 sm:p-6 overflow-hidden">
        <div className="flex-1 flex flex-col rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-sm">
          <Group
            orientation={isMobile ? "vertical" : "horizontal"}
            className="flex-1 min-h-0"
          >
            {/* Input Panel */}
            <Panel defaultSize="50%" minSize="25%" className="flex flex-col min-h-0">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] select-none">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Input
                  </span>
                  <span className="text-[11px] font-mono text-[var(--text-muted)]">
                    {byteLength.toLocaleString()} B
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={!input}
                  aria-label="Clear input"
                  className="flex items-center gap-1.5 px-2 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] rounded border border-transparent hover:border-[var(--border-subtle)] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste dotenv / environment variables here..."
                spellCheck={false}
                aria-label="Input environment variables"
                className="flex-1 w-full p-4 bg-[var(--bg-app)] text-[var(--text-primary)] font-mono text-xs leading-relaxed resize-none focus:outline-none"
              />
            </Panel>

            <Separator
              aria-label="Resize panels"
              className={`bg-[var(--border-subtle)] hover:bg-[var(--accent)] active:bg-[var(--accent)] transition-colors focus:outline-none ${
                isMobile
                  ? "h-1.5 cursor-row-resize w-full"
                  : "w-1.5 cursor-col-resize h-full"
              }`}
            />

            {/* Output Panel */}
            <Panel defaultSize="50%" minSize="25%" className="flex flex-col min-h-0">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] select-none">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Output
                  </span>
                  {input && !isOversized && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded font-mono bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                      {result.redactedAssignments} redacted
                    </span>
                  )}
                  {result.diagnostics.length > 0 && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded font-medium bg-[var(--warning-subtle)] border border-[var(--warning)] text-[var(--warning)] flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>
                        {result.diagnostics.length}{" "}
                        {result.diagnostics.length === 1
                          ? "line needs review"
                          : "lines need review"}
                      </span>
                    </span>
                  )}
                  {input &&
                    !isOversized &&
                    result.diagnostics.length === 0 &&
                    result.redactedAssignments > 0 && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded font-medium bg-[var(--success-subtle)] border border-[var(--success)] text-[var(--success)] flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Safe to share</span>
                      </span>
                    )}
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!result.output}
                  aria-label="Copy scrubbed output"
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-[var(--radius-sm)] bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-colors"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={result.output}
                readOnly
                placeholder="Redacted skeleton will appear here..."
                spellCheck={false}
                aria-label="Redacted environment output"
                className="flex-1 w-full p-4 bg-[var(--bg-app)] text-[var(--text-primary)] font-mono text-xs leading-relaxed resize-none focus:outline-none"
              />
            </Panel>
          </Group>

          {/* Diagnostics Section */}
          {result.diagnostics.length > 0 && (
            <div
              aria-label="Diagnostics review list"
              className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 flex flex-col gap-2 max-h-40 overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-[var(--warning)]">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Review Needed ({result.diagnostics.length})</span>
                </div>
                <span className="text-[11px] text-[var(--text-muted)]">
                  Lines left unchanged to prevent accidental leakage.
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {result.diagnostics.map((diag, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)] font-mono"
                  >
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--warning-subtle)] text-[var(--warning)] font-semibold shrink-0">
                      Line {diag.line}
                    </span>
                    <span className="truncate">{diag.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
