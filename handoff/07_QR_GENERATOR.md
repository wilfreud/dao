# Handoff 07 — Implement QR Generator

Implement the QR Generator described in `docs/15_QR_GENERATOR_SPEC.md`.

## Read first

1. `AGENTS.md`
2. `.agents/skills/tool-authoring/SKILL.md`
3. `.agents/skills/defensive-programming/SKILL.md`
4. `.agents/skills/spec-locked-tdd/SKILL.md`
5. `.agents/skills/ui-workbench/SKILL.md`
6. `docs/05_APP_SHELL_AND_SEARCH.md`
7. `docs/08_SECURITY.md`
8. `docs/09_TEST_STRATEGY.md`
9. `docs/15_QR_GENERATOR_SPEC.md`
10. `docs/16_TOOLING_ADDENDUM.md`

## Objective

Add `/tools/qr-generator`, register it in tool search, and keep its implementation frontend-first.

Do not create a Rust tool module unless a concrete requirement from the spec cannot be satisfied through the existing narrow Tauri plugin boundary.

## Dependencies

Use Bun:

```bash
bun add qrcode
bun add -d @types/qrcode
```

If clipboard-manager is already installed, do not reinstall it. Add only image-write permission where needed.

Required desktop clipboard permissions:

```text
clipboard-manager:allow-write-text
clipboard-manager:allow-write-image
```

Do not add clipboard read permissions.

## Implementation rules

- wrap `qrcode` behind one tool-local adapter;
- do not expose third-party option types throughout UI components;
- validate option values;
- bound UTF-8 input;
- preserve selected error correction level when capacity is exceeded;
- never silently lower correction level;
- debounce/defer live generation;
- prevent stale async results from winning over newer input;
- distinguish generation errors from clipboard errors;
- Copy Image must copy actual image data;
- Copy SVG copies SVG source as text;
- no HTTP requests;
- no telemetry;
- no URL preview/fetch.

## UX

Use an input/output split workspace when width permits.

The preview is the visual focus, but keep controls compact and utilitarian.

Required controls:

- input textarea;
- correction level: L/M/Q/H;
- raster size: 256/512/1024;
- margin: 0..8;
- Copy text;
- Copy image;
- Copy SVG;
- Clear.

Do not add QR styling/customization beyond the spec.

## Test order

1. options/defaults validation;
2. input byte bound;
3. qrcode adapter success;
4. capacity/error normalization;
5. stale-generation protection;
6. copy-text behavior;
7. copy-SVG behavior;
8. copy-image adapter behavior;
9. clear/reset behavior.

## Definition of done

- normal URL/text produces a scannable preview;
- Unicode input works within capacity;
- oversized/capacity-exceeded input shows a useful error;
- changing correction/size/margin regenerates output;
- copied image pastes as an image on supported desktop platforms;
- no Rust QR implementation exists;
- no network request exists;
- no clipboard read permission exists;
- home search finds `qr`, `make qr`, `qr url`, `turn link into qr`;
- repository frontend checks pass.
