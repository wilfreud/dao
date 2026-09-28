import { describe, it, expect } from "vitest";
import {
  DEFAULT_QR_OPTIONS,
  MAX_QR_INPUT_BYTES,
  QrGeneratorError,
} from "../../contracts/qr-generator";
import { validateQrOptions } from "./qr-options";
import { generateQrCode, dataUrlToUint8Array } from "./qr-generator";

describe("qr-options", () => {
  it("uses default options M, 512, margin 4 when empty", () => {
    const opts = validateQrOptions({});
    expect(opts).toEqual({
      errorCorrectionLevel: "M",
      width: 512,
      margin: 4,
    });
    expect(opts).toEqual(DEFAULT_QR_OPTIONS);
  });

  it("accepts valid options within bounds", () => {
    const opts = validateQrOptions({
      errorCorrectionLevel: "H",
      width: 1024,
      margin: 0,
    });
    expect(opts).toEqual({
      errorCorrectionLevel: "H",
      width: 1024,
      margin: 0,
    });
  });

  it("rejects margin below 0", () => {
    expect(() => validateQrOptions({ margin: -1 })).toThrowError(
      QrGeneratorError
    );
    expect(() => validateQrOptions({ margin: -1 })).toThrow(/Margin must be an integer between 0 and 8/);
  });

  it("rejects margin above 8", () => {
    expect(() => validateQrOptions({ margin: 9 })).toThrowError(
      QrGeneratorError
    );
    expect(() => validateQrOptions({ margin: 9 })).toThrow(/Margin must be an integer between 0 and 8/);
  });

  it("rejects non-integer margin", () => {
    expect(() => validateQrOptions({ margin: 2.5 })).toThrowError(
      QrGeneratorError
    );
  });

  it("rejects unsupported raster size", () => {
    // @ts-expect-error testing invalid size
    expect(() => validateQrOptions({ width: 300 })).toThrowError(
      QrGeneratorError
    );
    // @ts-expect-error testing invalid size
    expect(() => validateQrOptions({ width: 300 })).toThrow(/Invalid raster width/);
  });

  it("rejects unsupported error correction level", () => {
    // @ts-expect-error testing invalid level
    expect(() => validateQrOptions({ errorCorrectionLevel: "X" })).toThrowError(
      QrGeneratorError
    );
    // @ts-expect-error testing invalid level
    expect(() => validateQrOptions({ errorCorrectionLevel: "X" })).toThrow(
      /Invalid error correction level/
    );
  });
});

describe("generateQrCode", () => {
  it("returns empty result on empty string without calling generator", async () => {
    const result = await generateQrCode("");
    expect(result.svg).toBe("");
    expect(result.pngDataUrl).toBe("");
  });

  it("rejects input exceeding MAX_QR_INPUT_BYTES (2953 bytes)", async () => {
    const oversized = "a".repeat(MAX_QR_INPUT_BYTES + 1);
    await expect(generateQrCode(oversized)).rejects.toThrowError(
      QrGeneratorError
    );
    try {
      await generateQrCode(oversized);
    } catch (err: unknown) {
      const qErr = err as QrGeneratorError;
      expect(qErr.code).toBe("INPUT_TOO_LARGE");
    }
  });

  it("generates valid SVG and PNG data URL for ASCII URL", async () => {
    const result = await generateQrCode("https://example.com/api/test");
    expect(result.svg).toContain("<svg");
    expect(result.svg).toContain("</svg>");
    expect(result.pngDataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it("generates valid QR code for Unicode and emoji input within capacity", async () => {
    const unicodeInput = "こんにちは世界 🚀 Bonjour le monde!";
    const result = await generateQrCode(unicodeInput);
    expect(result.svg).toContain("<svg");
    expect(result.pngDataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it("maps QR capacity overflow error to QR_CAPACITY_EXCEEDED with H correction", async () => {
    // 1500 bytes of dense binary/alphanumeric data will overflow Level H (max capacity is ~1273 bytes for binary in v40-H)
    const largeData = "https://example.com/deep/path/resource?query=" + "x".repeat(1500);
    try {
      await generateQrCode(largeData, { errorCorrectionLevel: "H" });
      expect.unreachable("should have thrown capacity error");
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(QrGeneratorError);
      const qErr = err as QrGeneratorError;
      expect(qErr.code).toBe("QR_CAPACITY_EXCEEDED");
    }
  });
});

describe("dataUrlToUint8Array", () => {
  it("converts a valid base64 data URL to bytes", () => {
    // "hello" in base64 is "aGVsbG8="
    const dataUrl = "data:image/png;base64,aGVsbG8=";
    const bytes = dataUrlToUint8Array(dataUrl);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(bytes)).toBe("hello");
  });

  it("throws on invalid data URL without comma", () => {
    expect(() => dataUrlToUint8Array("invalid-data-url")).toThrowError(
      QrGeneratorError
    );
  });
});
