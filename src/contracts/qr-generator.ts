export type QrErrorCorrectionLevel = "L" | "M" | "Q" | "H";
export type QrRasterSize = 256 | 512 | 1024;

export interface QrOptions {
  readonly errorCorrectionLevel: QrErrorCorrectionLevel;
  readonly width: QrRasterSize;
  readonly margin: number;
}

export const QR_ERROR_CORRECTION_LEVELS: readonly QrErrorCorrectionLevel[] = [
  "L",
  "M",
  "Q",
  "H",
] as const;

export const QR_RASTER_SIZES: readonly QrRasterSize[] = [
  256,
  512,
  1024,
] as const;

export const DEFAULT_QR_OPTIONS: QrOptions = Object.freeze({
  errorCorrectionLevel: "M",
  width: 512,
  margin: 4,
});

export const MIN_QR_MARGIN = 0;
export const MAX_QR_MARGIN = 8;
export const MAX_QR_INPUT_BYTES = 2953;

export type QrGeneratorErrorCode =
  | "INPUT_TOO_LARGE"
  | "INVALID_OPTIONS"
  | "QR_CAPACITY_EXCEEDED"
  | "GENERATION_FAILED"
  | "CLIPBOARD_IMAGE_UNSUPPORTED"
  | "CLIPBOARD_WRITE_FAILED";

export class QrGeneratorError extends Error {
  readonly code: QrGeneratorErrorCode;

  constructor(code: QrGeneratorErrorCode, message: string) {
    super(message);
    this.name = "QrGeneratorError";
    this.code = code;
  }
}

export interface QrGenerationResult {
  readonly svg: string;
  readonly pngDataUrl: string;
}
