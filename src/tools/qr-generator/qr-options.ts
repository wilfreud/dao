import {
  DEFAULT_QR_OPTIONS,
  MAX_QR_MARGIN,
  MIN_QR_MARGIN,
  QR_ERROR_CORRECTION_LEVELS,
  QR_RASTER_SIZES,
  QrGeneratorError,
  type QrErrorCorrectionLevel,
  type QrOptions,
  type QrRasterSize,
} from "../../contracts/qr-generator";

export function isQrErrorCorrectionLevel(
  value: unknown
): value is QrErrorCorrectionLevel {
  return (
    typeof value === "string" &&
    QR_ERROR_CORRECTION_LEVELS.includes(value as QrErrorCorrectionLevel)
  );
}

export function isQrRasterSize(value: unknown): value is QrRasterSize {
  return (
    typeof value === "number" &&
    QR_RASTER_SIZES.includes(value as QrRasterSize)
  );
}

export function isValidMargin(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_QR_MARGIN &&
    value <= MAX_QR_MARGIN
  );
}

export function validateQrOptions(options: Partial<QrOptions> = {}): QrOptions {
  const errorCorrectionLevel =
    options.errorCorrectionLevel ?? DEFAULT_QR_OPTIONS.errorCorrectionLevel;
  if (!isQrErrorCorrectionLevel(errorCorrectionLevel)) {
    throw new QrGeneratorError(
      "INVALID_OPTIONS",
      `Invalid error correction level: '${String(errorCorrectionLevel)}'. Expected L, M, Q, or H.`
    );
  }

  const width = options.width ?? DEFAULT_QR_OPTIONS.width;
  if (!isQrRasterSize(width)) {
    throw new QrGeneratorError(
      "INVALID_OPTIONS",
      `Invalid raster width: '${String(width)}'. Expected 256, 512, or 1024.`
    );
  }

  const margin = options.margin ?? DEFAULT_QR_OPTIONS.margin;
  if (!isValidMargin(margin)) {
    throw new QrGeneratorError(
      "INVALID_OPTIONS",
      `Invalid margin: '${String(margin)}'. Margin must be an integer between ${MIN_QR_MARGIN} and ${MAX_QR_MARGIN}.`
    );
  }

  return {
    errorCorrectionLevel,
    width,
    margin,
  };
}
