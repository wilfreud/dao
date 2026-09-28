# Research sources and version snapshot

Research refreshed: **2026-09-28**.

This file exists so future agents can distinguish architectural decisions from facts that may change with package releases.

## Tauri

- Create project: https://v2.tauri.app/start/create-project/
- Capabilities: https://v2.tauri.app/security/capabilities/
- Permissions: https://v2.tauri.app/security/permissions/
- Dialog plugin: https://v2.tauri.app/plugin/dialog/
- Clipboard plugin: https://v2.tauri.app/plugin/clipboard/
- Rust crate docs: https://docs.rs/tauri/latest/tauri/

Observed during research:

- `tauri` crate: 2.12.0 visible on docs.rs, Rust 1.90 minimum in its crate metadata.
- npm indexes observed `@tauri-apps/api` 2.11.1 and `@tauri-apps/cli` 2.11.5.
- `tauri-plugin-dialog` moved rapidly (2.8.0 visible on crates/docs while npm indexing could lag).

**Consequence:** use current `create-tauri-app` + `bun runtauri add <plugin>` and preserve the generated compatible set. Do not copy hard-pinned Tauri internals from this snapshot.

## Embedded HTTP/runtime

- Axum: https://docs.rs/axum/latest/axum/
- Axum multipart: https://docs.rs/axum/latest/axum/extract/struct.Multipart.html
- Tower HTTP request body limit: https://docs.rs/tower-http/latest/tower_http/limit/index.html
- Tokio util cancellation token: https://docs.rs/tokio-util/latest/tokio_util/sync/struct.CancellationToken.html

Observed stable versions:

- axum 0.8.9
- tower-http 0.7.1
- tokio-util 0.7.19

Axum's multipart field supports chunked reads; use streaming rather than reading an entire upload into memory.

## File/network helpers

- local-ip-address: https://docs.rs/local-ip-address/latest/local_ip_address/
- sanitize-filename: https://docs.rs/sanitize-filename/latest/sanitize_filename/
- tempfile: https://docs.rs/tempfile/latest/tempfile/

Observed:

- local-ip-address 0.6.13
- sanitize-filename 0.6.0 stable (0.7 line was beta during research)
- tempfile 3.27.0

## Serialization/errors

- Serde: https://docs.rs/serde/latest/serde/
- thiserror: https://docs.rs/thiserror/latest/thiserror/

Observed:

- serde 1.0.229
- thiserror 2.0.21

## Frontend

- React: https://www.npmjs.com/package/react
- React Router: https://www.npmjs.com/package/react-router
- Fuse.js: https://www.fusejs.io/
- react-resizable-panels: https://www.npmjs.com/package/react-resizable-panels
- Tailwind: https://www.npmjs.com/package/tailwindcss
- Vitest: https://www.npmjs.com/package/vitest
- Testing Library React: https://www.npmjs.com/package/@testing-library/react
- Lucide React: https://www.npmjs.com/package/lucide-react

Observed:

- React 19.3.0
- React Router latest was 8.4.0; maintained v7 channel was 7.18.4. V0 intentionally chooses 7.18.4.
- Fuse.js 7.5.0 (zero-dependency fuzzy/token search)
- react-resizable-panels 4.12.4
- Tailwind 4.3.3
- Vitest 5.0.1
- Testing Library React 16.3.3
- Lucide React 1.48.0

## dotenv syntax research

Upstream parser source used only as behavioral research:

- https://github.com/motdotla/dotenv/blob/master/lib/main.js
- https://github.com/motdotla/dotenv/blob/master/README.md

Important observations:

- optional `export` prefix;
- keys accept alphanumeric, `_`, `.`, `-`;
- `=` separator and a colon form requiring whitespace;
- single, double and backtick quotes;
- quoted values may span lines;
- unquoted `#` starts a comment;
- parser returns semantic key/value data and normalizes CRLF to LF.

The Env Scrubber therefore implements an independent format-aware scanner instead of importing/copying the parser.

## Existing project-owner coding disciplines

Reference repository:

- https://github.com/wilfreud/skills-or-something

Relevant concepts reviewed:

- defensive programming
- spec-locked TDD
- structural refactor

The local `.agents/skills` files in this pack are concise project-specific adaptations, not verbatim copies.
