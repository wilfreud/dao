import QRCode from "qrcode";
import {
  DEFAULT_QR_OPTIONS,
  MAX_QR_INPUT_BYTES,
  QrGeneratorError,
  type QrGenerationResult,
  type QrOptions,
} from "../../contracts/qr-generator";
import { validateQrOptions } from "./qr-options";

/**
 * Pure-ish adapter wrapping the third-party qrcode library.
 * Normalizes options, bounds UTF-8 bytes, and normalizes errors.
 */
export async function generateQrCode(
  input: string,
  options: Partial<QrOptions> = DEFAULT_QR_OPTIONS
): Promise<QrGenerationResult> {
  if (input === "") {
    return {
      svg: "",
      pngDataUrl: "",
    };
  }

  const validOptions = validateQrOptions(options);

  const utf8ByteLength = new TextEncoder().encode(input).length;
  if (utf8ByteLength > MAX_QR_INPUT_BYTES) {
    throw new QrGeneratorError(
      "INPUT_TOO_LARGE",
      `Input exceeds maximum supported QR code data limit (${utf8ByteLength} / ${MAX_QR_INPUT_BYTES} bytes).`
    );
  }

  try {
    const svg = await QRCode.toString(input, {
      type: "svg",
      errorCorrectionLevel: validOptions.errorCorrectionLevel,
      margin: validOptions.margin,
      width: validOptions.width,
    });

    const pngDataUrl = await QRCode.toDataURL(input, {
      type: "image/png",
      errorCorrectionLevel: validOptions.errorCorrectionLevel,
      margin: validOptions.margin,
      width: validOptions.width,
    });

    return {
      svg,
      pngDataUrl,
    };
  } catch (err: unknown) {
    if (err instanceof QrGeneratorError) {
      throw err;
    }

    const rawMessage = err instanceof Error ? err.message : String(err);
    const lowerMessage = rawMessage.toLowerCase();

    if (
      lowerMessage.includes("amount of data") ||
      lowerMessage.includes("too much data") ||
      lowerMessage.includes("capacity") ||
      lowerMessage.includes("overflow") ||
      lowerMessage.includes("code length") ||
      lowerMessage.includes("too large")
    ) {
      throw new QrGeneratorError(
        "QR_CAPACITY_EXCEEDED",
        `Input data exceeds QR capacity for error correction level '${validOptions.errorCorrectionLevel}'.`
      );
    }

    throw new QrGeneratorError(
      "GENERATION_FAILED",
      `QR generation failed: ${rawMessage}`
    );
  }
}

/**
 * Converts a base64 PNG data URL to a raw Uint8Array buffer for clipboard writing.
 */
export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) {
    throw new QrGeneratorError(
      "GENERATION_FAILED",
      "Invalid image data URL format."
    );
  }

  const base64 = dataUrl.slice(commaIndex + 1);
  try {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (err: unknown) {
    throw new QrGeneratorError(
      "GENERATION_FAILED",
      `Failed to decode image data URL: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
