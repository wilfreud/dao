import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Copy,
  Check,
  Trash2,
  AlertCircle,
  FileCode,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { ToolPageHeader } from "../../foundation/ui";
import { copyText, copyImage } from "../../foundation/clipboard";
import { qrGeneratorManifest } from "./manifest";
import {
  DEFAULT_QR_OPTIONS,
  MAX_QR_INPUT_BYTES,
  MAX_QR_MARGIN,
  MIN_QR_MARGIN,
  QR_ERROR_CORRECTION_LEVELS,
  QR_RASTER_SIZES,
  QrGeneratorError,
  type QrErrorCorrectionLevel,
  type QrGenerationResult,
  type QrOptions,
  type QrRasterSize,
} from "../../contracts/qr-generator";
import { generateQrCode, dataUrlToUint8Array } from "./qr-generator";

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

export function QrGeneratorPage() {
  const isMobile = useIsMobile();
  const [input, setInput] = useState<string>("");
  const [options, setOptions] = useState<QrOptions>(DEFAULT_QR_OPTIONS);

  const [generationResult, setGenerationResult] =
    useState<QrGenerationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [copiedSvg, setCopiedSvg] = useState<boolean>(false);
  const [copiedImage, setCopiedImage] = useState<boolean>(false);
  const [clipboardError, setClipboardError] = useState<string | null>(null);

  // Monotonically increasing request counter to drop stale async results
  const requestIdRef = useRef<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const byteLength = useMemo(() => {
    return new TextEncoder().encode(input).length;
  }, [input]);

  const isOversized = byteLength > MAX_QR_INPUT_BYTES;

  const runGeneration = useCallback(
    async (text: string, currentOptions: QrOptions) => {
      const currentRequestId = ++requestIdRef.current;

      if (!text.trim()) {
        setGenerationResult(null);
        setGenerationError(null);
        setIsGenerating(false);
        return;
      }

      setIsGenerating(true);
      setGenerationError(null);

      try {
        const result = await generateQrCode(text, currentOptions);
        if (currentRequestId === requestIdRef.current) {
          setGenerationResult(result);
          setGenerationError(null);
          setIsGenerating(false);
        }
      } catch (err: unknown) {
        if (currentRequestId === requestIdRef.current) {
          const message =
            err instanceof QrGeneratorError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Failed to generate QR code";
          setGenerationError(message);
          setGenerationResult(null);
          setIsGenerating(false);
        }
      }
    },
    []
  );

  // Trigger generation with debounce when input changes
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!input.trim()) {
      requestIdRef.current++;
      setGenerationResult(null);
      setGenerationError(null);
      setIsGenerating(false);
      return;
    }

    if (isOversized) {
      requestIdRef.current++;
      setGenerationError(
        `Too much data for a QR code (${byteLength} / ${MAX_QR_INPUT_BYTES} bytes).`
      );
      setGenerationResult(null);
      setIsGenerating(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      void runGeneration(input, options);
    }, 180);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [input, isOversized, byteLength, options, runGeneration]);

  const handleClear = () => {
    requestIdRef.current++;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setInput("");
    setGenerationResult(null);
    setGenerationError(null);
    setClipboardError(null);
    setIsGenerating(false);
  };

  const handleCorrectionLevelChange = (level: QrErrorCorrectionLevel) => {
    const nextOptions: QrOptions = { ...options, errorCorrectionLevel: level };
    setOptions(nextOptions);
  };

  const handleRasterSizeChange = (size: QrRasterSize) => {
    const nextOptions: QrOptions = { ...options, width: size };
    setOptions(nextOptions);
  };

  const handleMarginChange = (val: number) => {
    const clamped = Math.max(MIN_QR_MARGIN, Math.min(MAX_QR_MARGIN, val));
    const nextOptions: QrOptions = { ...options, margin: clamped };
    setOptions(nextOptions);
  };

  const handleCopyText = async () => {
    if (!input) return;
    setClipboardError(null);
    try {
      await copyText(input);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch (err: unknown) {
      setClipboardError(
        `Failed to copy text: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  const handleCopySvg = async () => {
    if (!generationResult?.svg) return;
    setClipboardError(null);
    try {
      await copyText(generationResult.svg);
      setCopiedSvg(true);
      setTimeout(() => setCopiedSvg(false), 2000);
    } catch (err: unknown) {
      setClipboardError(
        `Failed to copy SVG: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  const handleCopyImage = async () => {
    if (!generationResult?.pngDataUrl) return;
    setClipboardError(null);
    try {
      const bytes = dataUrlToUint8Array(generationResult.pngDataUrl);
      await copyImage(bytes);
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2000);
    } catch (err: unknown) {
      setClipboardError(
        `Failed to copy image: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-app)] overflow-hidden">
      <ToolPageHeader
        title={qrGeneratorManifest.name}
        category={qrGeneratorManifest.category}
      />

      <main className="flex-1 flex flex-col min-h-0 p-4 sm:p-6 overflow-hidden">
        <div className="flex-1 flex flex-col rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-sm">
          <Group
            orientation={isMobile ? "vertical" : "horizontal"}
            className="flex-1 min-h-0"
          >
            {/* Input & Options Panel */}
            <Panel
              defaultSize="50%"
              minSize="30%"
              className="flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-[var(--border-subtle)]"
            >
              {/* Input Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] select-none">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Input
                  </span>
                  <span
                    className={`text-[11px] font-mono ${
                      isOversized
                        ? "text-[var(--danger)] font-semibold"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    {byteLength.toLocaleString()} / {MAX_QR_INPUT_BYTES} B
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyText}
                    disabled={!input}
                    aria-label="Copy input text"
                    className="flex items-center gap-1.5 px-2 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] rounded border border-transparent hover:border-[var(--border-subtle)] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-colors"
                  >
                    {copiedText ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[var(--success)]" />
                        <span className="text-[var(--success)] font-medium">
                          Copied
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy text</span>
                      </>
                    )}
                  </button>
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
              </div>

              {/* Textarea */}
              <div className="flex-1 p-3 min-h-[140px] flex flex-col">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter text or URL to generate QR code..."
                  aria-label="QR code input content"
                  className="flex-1 w-full p-2.5 text-sm font-mono bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none leading-relaxed"
                  spellCheck={false}
                />
              </div>

              {/* Options Section */}
              <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)] flex flex-col gap-3">
                <div className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Options
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Correction Level */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="correction-select"
                      className="text-xs text-[var(--text-muted)]"
                    >
                      Error Correction
                    </label>
                    <div
                      id="correction-select"
                      role="radiogroup"
                      aria-label="Error Correction Level"
                      className="flex items-center rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5"
                    >
                      {QR_ERROR_CORRECTION_LEVELS.map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          role="radio"
                          aria-checked={options.errorCorrectionLevel === lvl}
                          onClick={() => handleCorrectionLevelChange(lvl)}
                          className={`flex-1 py-1 text-xs font-mono font-medium rounded transition-colors ${
                            options.errorCorrectionLevel === lvl
                              ? "bg-[var(--accent)] text-white"
                              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Raster Size */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="raster-size-select"
                      className="text-xs text-[var(--text-muted)]"
                    >
                      Size (PNG)
                    </label>
                    <div
                      id="raster-size-select"
                      role="radiogroup"
                      aria-label="Raster Size"
                      className="flex items-center rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5"
                    >
                      {QR_RASTER_SIZES.map((size) => (
                        <button
                          key={size}
                          type="button"
                          role="radio"
                          aria-checked={options.width === size}
                          onClick={() => handleRasterSizeChange(size)}
                          className={`flex-1 py-1 text-xs font-mono font-medium rounded transition-colors ${
                            options.width === size
                              ? "bg-[var(--accent)] text-white"
                              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Margin */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="margin-input"
                      className="text-xs text-[var(--text-muted)]"
                    >
                      Margin (Quiet Zone)
                    </label>
                    <div className="flex items-center rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1">
                      <input
                        id="margin-input"
                        type="number"
                        min={MIN_QR_MARGIN}
                        max={MAX_QR_MARGIN}
                        value={options.margin}
                        onChange={(e) =>
                          handleMarginChange(Number.parseInt(e.target.value, 10) || 0)
                        }
                        className="w-full text-xs font-mono bg-transparent text-[var(--text-primary)] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Panel>

            <Separator className="w-1 md:w-1.5 bg-transparent hover:bg-[var(--accent)] transition-colors cursor-col-resize select-none" />

            {/* Output / Preview Panel */}
            <Panel
              defaultSize="50%"
              minSize="30%"
              className="flex flex-col min-h-0 bg-[var(--bg-app)]"
            >
              {/* Output Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] select-none">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Preview
                  </span>
                  {isGenerating && (
                    <Loader2 className="w-3.5 h-3.5 text-[var(--text-muted)] animate-spin" />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Copy Image Button */}
                  <button
                    type="button"
                    onClick={handleCopyImage}
                    disabled={!generationResult}
                    aria-label="Copy QR code as image"
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
                  >
                    {copiedImage ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[var(--success)]" />
                        <span className="text-[var(--success)]">Copied Image</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span>Copy image</span>
                      </>
                    )}
                  </button>

                  {/* Copy SVG Button */}
                  <button
                    type="button"
                    onClick={handleCopySvg}
                    disabled={!generationResult}
                    aria-label="Copy QR code SVG source text"
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
                  >
                    {copiedSvg ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[var(--success)]" />
                        <span className="text-[var(--success)]">Copied SVG</span>
                      </>
                    ) : (
                      <>
                        <FileCode className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span>Copy SVG</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Clipboard Failure Notice */}
              {clipboardError && (
                <div
                  role="alert"
                  className="mx-4 mt-3 p-2.5 rounded border border-[var(--danger)] bg-[var(--danger-subtle)] text-[var(--danger)] text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{clipboardError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setClipboardError(null)}
                    className="text-xs underline hover:no-underline ml-2"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Preview Body */}
              <div className="flex-1 p-6 flex flex-col items-center justify-center min-h-[220px]">
                {generationError ? (
                  <div
                    role="alert"
                    className="max-w-md w-full p-4 rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--danger-subtle)] text-[var(--danger)] flex flex-col items-center text-center gap-2"
                  >
                    <AlertCircle className="w-6 h-6 shrink-0" />
                    <span className="text-xs font-medium leading-relaxed">
                      {generationError}
                    </span>
                  </div>
                ) : generationResult ? (
                  <div className="flex flex-col items-center gap-4">
                    {/* QR Code Container */}
                    <div
                      data-testid="qr-preview-container"
                      className="p-4 bg-white rounded-[var(--radius-md)] shadow-sm border border-[var(--border-subtle)] max-w-[280px] sm:max-w-[320px] aspect-square flex items-center justify-center select-none"
                      dangerouslySetInnerHTML={{ __html: generationResult.svg }}
                    />
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">
                      Level {options.errorCorrectionLevel} · {options.width}px · Margin {options.margin}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center text-[var(--text-muted)] select-none">
                    <div className="w-12 h-12 rounded-full border border-dashed border-[var(--border-default)] flex items-center justify-center text-[var(--text-muted)]">
                      <ImageIcon className="w-5 h-5 opacity-40" />
                    </div>
                    <span className="text-xs">
                      Enter text to generate a QR code.
                    </span>
                  </div>
                )}
              </div>
            </Panel>
          </Group>
        </div>
      </main>
    </div>
  );
}
