# QR Generator — Product & Engineering Specification

## 1. Purpose

Generate QR codes locally from text or URLs without sending content to a network service.

This tool is intentionally small and frontend-first. It should demonstrate that a toolbox tool does **not** need a Rust domain merely because the host application uses Tauri.

---

## 2. Scope — V1

### Included

- Arbitrary text input.
- URL input works as normal text; no special network request occurs.
- Live QR preview.
- Error correction level selector: `L`, `M`, `Q`, `H`.
- Output size selector for raster copy: `256`, `512`, `1024` px.
- Quiet-zone / margin selector with a small bounded range.
- Copy original input text.
- Copy QR code as an image to the system clipboard.
- Copy QR code as SVG source text.
- Clear/reset.
- Local-only generation.

### Explicitly excluded from V1

- Logo embedding.
- Decorative/custom QR dots.
- Gradient/color editor.
- Wi-Fi credential wizard.
- vCard/contact wizard.
- QR scanning/decoding.
- Camera access.
- Cloud storage.
- History/database of generated QR codes.
- Analytics/telemetry.
- Automatic URL shortening.

---

## 3. Dependencies

Use Bun:

```bash
bun add qrcode
bun add -d @types/qrcode
```

`qrcode` currently exposes browser APIs for Canvas, Data URL and SVG-string generation.

The existing Tauri clipboard plugin should be extended to allow image writes.

If clipboard-manager is already installed, do not reinstall it unnecessarily. Ensure capabilities include only what this tool needs:

```json
"clipboard-manager:allow-write-text",
"clipboard-manager:allow-write-image"
```

Do not add clipboard read permissions.

No new Rust crate is required.

---

## 4. Tool manifest

```ts
export const qrGeneratorManifest = {
  id: "qr-generator",
  name: "QR Generator",
  description: "Generate and copy QR codes locally from text or URLs.",
  route: "/tools/qr-generator",
  aliases: [
    "qr",
    "qr code",
    "barcode",
    "link qr",
    "url qr",
    "text qr"
  ],
  examples: [
    "make a qr code",
    "turn this url into a qr",
    "generate qr from text"
  ],
  capabilities: ["text-transform", "clipboard-image"]
} as const;
```

---

## 5. UX

Use a two-column workbench on sufficiently wide windows and stack vertically on narrow windows.

```text
QR Generator

┌─────────────────────────┬─────────────────────────┐
│ Input                   │ Preview                 │
│                         │                         │
│ https://example.com     │       ████████          │
│                         │       ██    ██          │
│                         │       ████████          │
│                         │                         │
│ Error correction [ M ]  │ [ Copy image ]         │
│ Size             [512]  │ [ Copy SVG ]           │
│ Margin           [ 4 ]  │                         │
│                         │                         │
│ [ Clear ] [ Copy text ] │                         │
└─────────────────────────┴─────────────────────────┘
```

Use the project’s existing split/resizable workbench primitive if it already exists and is appropriate. Do not create a bespoke panel system just for this tool.

### Empty state

No QR placeholder required. Show a quiet empty preview:

> Enter text to generate a QR code.

### Generation error

When data exceeds QR capacity for the chosen correction level, show a user-facing error near the preview rather than throwing to the route error boundary.

---

## 6. Pure TypeScript domain

Recommended structure:

```text
src/tools/qr-generator/
├── manifest.ts
├── qr-options.ts
├── qr-generator.ts
├── QrGeneratorPage.tsx
├── components/
└── tests/
```

This tool does not require `domain/application/infrastructure` folders unless implementation complexity actually earns them.

---

## 7. Types

```ts
export type QrErrorCorrectionLevel = "L" | "M" | "Q" | "H";
export type QrRasterSize = 256 | 512 | 1024;

export type QrOptions = {
  errorCorrectionLevel: QrErrorCorrectionLevel;
  width: QrRasterSize;
  margin: number;
};

export type QrGenerationResult = {
  svg: string;
  pngDataUrl: string;
};
```

Defaults:

```ts
const DEFAULT_QR_OPTIONS: QrOptions = {
  errorCorrectionLevel: "M",
  width: 512,
  margin: 4,
};
```

Allowed margin range:

```text
0..=8
```

Clamp or reject outside the range at the pure-function boundary; prefer rejecting impossible program state in domain code and constraining valid values in UI controls.

---

## 8. Input bounds

Bound the work even though the QR library performs its own capacity checks.

Before generation:

- empty string => no generation;
- compute UTF-8 byte length with `TextEncoder`;
- reject inputs above `2953` bytes with a clear “Too much data for a QR code” message;
- still catch capacity errors from the QR library because higher error-correction levels have lower effective capacity.

The library remains the final authority on whether the selected options fit the QR symbol.

Do not silently reduce error correction level to make content fit.

---

## 9. Generation contract

Provide one pure-ish async adapter around the third-party library:

```ts
export async function generateQrCode(
  input: string,
  options: QrOptions,
): Promise<QrGenerationResult>;
```

Behavior:

1. validate input/options;
2. call `QRCode.toString(input, { type: "svg", ... })`;
3. call `QRCode.toDataURL(input, { type: "image/png", ... })`;
4. return both outputs;
5. normalize third-party exceptions into a local `QrGenerationError`.

Do not let `qrcode` types leak throughout the UI layer.

---

## 10. Rendering/update behavior

Generation may update live while the user types, but it must not execute on every keystroke without control.

Use one of:

- a short debounce around `150–250 ms`; or
- React deferred rendering if already established in the codebase.

Requirements:

- stale async generation results must not replace a newer input result;
- clearing input immediately clears preview;
- changing options regenerates the current input;
- generation failure preserves the input and options.

A monotonically increasing request/version id is sufficient; no global state manager is needed.

---

## 11. Copy image

The PNG Data URL is for preview/export logic, but copying an image to Tauri’s system clipboard should produce actual image bytes.

Implementation boundary:

1. generate PNG Data URL;
2. convert Data URL to `Uint8Array`/binary buffer;
3. pass supported image bytes to `writeImage` from `@tauri-apps/plugin-clipboard-manager`;
4. show success/failure feedback.

Do not fall back to copying the Data URL as text while telling the user the image was copied.

If platform image clipboard support is unavailable, disable/hide the image-copy action with an accurate explanation rather than silently changing semantics.

---

## 12. Copy SVG

Use existing clipboard text foundation.

Copy the complete generated SVG source.

Label the action clearly as **Copy SVG**, not “Copy QR image”, because the clipboard payload is text/XML.

---

## 13. Security/privacy

- No HTTP requests.
- No URL fetch/preview.
- No remote QR API.
- No telemetry.
- No clipboard read permission.
- Only clipboard write-text and write-image permissions.
- Treat user text as opaque data.
- Never render input as HTML.
- SVG output generated by the trusted QR library is used for display/copy; do not concatenate raw input into custom SVG markup.

---

## 14. Error model

```ts
type QrGeneratorErrorCode =
  | "INPUT_TOO_LARGE"
  | "INVALID_OPTIONS"
  | "QR_CAPACITY_EXCEEDED"
  | "GENERATION_FAILED"
  | "CLIPBOARD_IMAGE_UNSUPPORTED"
  | "CLIPBOARD_WRITE_FAILED";
```

UI errors must distinguish generation from clipboard failure.

Example:

- generation failure: preview area shows error;
- clipboard failure: QR stays visible, action reports copy failure.

---

## 15. Testing

### Unit tests

- defaults are exactly `M / 512 / margin 4`;
- margin below `0` rejected;
- margin above `8` rejected;
- unsupported raster size rejected;
- unsupported correction level rejected;
- empty input returns/produces empty state without calling generator;
- UTF-8 input above the configured hard bound rejected;
- normal ASCII URL generates SVG containing an `<svg` root;
- Unicode input generates successfully when it fits;
- capacity error maps to local error type.

### UI tests

- empty state;
- typing valid input eventually renders preview;
- stale generation result does not replace newer input;
- option change regenerates preview;
- Copy text copies raw input;
- Copy SVG copies generated SVG;
- Copy image invokes image clipboard adapter;
- image-copy failure does not destroy preview;
- Clear resets input + preview + error.

---

## 16. Acceptance criteria

1. The tool works fully offline.
2. A URL typed into the input produces a scannable QR preview.
3. Error correction level and size changes regenerate the output.
4. Text exceeding supported capacity yields a clear bounded error.
5. Copy image writes an actual image to the desktop clipboard on supported desktop platforms.
6. Copy SVG copies SVG source as text.
7. No Rust tool-specific module is introduced.
8. No clipboard read permission is introduced.
9. No network request is introduced.
