# V0 Implementation Status — Developer Workbench (`dao`)

## 1. Implemented Scope

The application is a lightweight, local-first desktop developer workbench built with Tauri v2, React 19, TypeScript, and Rust. All V0 milestone requirements are implemented and verified.

### App Shell & Navigation
- **Hash-Based Router**: Zero-configuration client routing (`#/`, `#/tools/drop-server`, `#/tools/env-scrubber`, and 404 fallback).
- **Launcher**: Minimalist, keyboard-navigable tool launcher with autofocus search, Escape key reset, and category badges.
- **Intent Search Engine**: Powered by `FuseSearchEngine`, fuzzy matching tool names, descriptions, categories, aliases, and natural language intent/example phrases with weighted relevance scoring.
- **Launcher State Preservation**: Retains active query and scroll position when navigating back from tools via `LauncherStateProvider`.
- **Static Tool Registry**: Compile-time static registration with runtime invariant validation ensuring kebab-case IDs, matching routes, and search metadata.

### Tool 1: LAN Drop Server
- **IPv4 Enumeration**: Local interface enumeration via `local-ip-address`, filtering out loopbacks (`127.0.0.0/8`), `0.0.0.0`, multicast, and link-local (`169.254.0.0/16`) while classifying RFC1918 private candidates and highlighting recommended interfaces.
- **Strict Single-IP Binding**: Binds exclusively to the chosen IPv4 address; never binds `0.0.0.0`.
- **Atomic Port Allocation**: Fixed port mode validates against 1024..=65535 and detects conflicts; Auto mode binds directly to port `0` and reads the assigned port atomically without check-then-bind races.
- **Streaming Multipart Receiver**: Axum HTTP server streams chunks directly into RAII temporary files created in the destination directory. Never buffers full files in memory.
- **Safe Persistence**: Resolves filename collisions incrementally (`photo (1).jpg`) up to 10,000 attempts without clobbering existing files.
- **Path Traversal Sanitization**: Strips path traversal characters, illegal platform characters, and limits filename length to 240 bytes while preserving extensions and valid UTF-8 boundaries.
- **Workbench UI**: Directory selection via native Tauri dialog, Start/Stop toggle, prominent copyable URL focal point, recent uploads list, lifecycle status badges, and a network exposure security notice.

### Tool 2: Env Scrubber
- **Format-Aware Scanner**: Pure TypeScript scanner inspired by dotenv syntax rules without pulling in `dotenv` as a dependency.
- **High-Fidelity Preservation**: Preserves comments (`#`), blank lines, assignment order, key spelling, optional `export`, surrounding whitespace, separator styles (`=` or `: `), and quote styles (`'`, `"`, \`).
- **Secret Redaction**: Strips value content while retaining delimiters. Removes internal lines from multiline quoted values.
- **Diagnostic Safety**: Unrecognized lines and unterminated quotes remain unredacted in output and produce line-numbered diagnostics. The "Safe to share" indicator is strictly suppressed while diagnostics exist.
- **Bounded Input**: Rejects and avoids freezing on input exceeding 1 MiB (`MAX_ENV_INPUT_BYTES`).
- **Workbench UI**: Resizable horizontal split panels with vertical fallback on narrow screens via `react-resizable-panels`, live byte counter, redacted count badge, Clear action, and clipboard Copy button.

---

## 2. Architecture Tree

```text
dao/
├── Cargo.lock
├── Cargo.toml
├── bun.lock
├── package.json
├── tauri.conf.json -> src-tauri/tauri.conf.json
├── src/
│   ├── app/
│   │   ├── App.tsx                     # Top-level shell provider & hash router
│   │   ├── LauncherPage.tsx            # Workbench launcher with search & grid
│   │   ├── LauncherPage.test.tsx       # Launcher interaction tests
│   │   ├── NotFoundPage.tsx            # 404 route fallback
│   │   ├── launcher-state.tsx          # Query & scroll preservation context
│   │   ├── launcher-state.test.tsx     # Session state tests
│   │   ├── router.tsx                  # Hash-based route configuration
│   │   ├── search/
│   │   │   ├── fuse-search-engine.ts   # Fuse.js weighted fuzzy search implementation
│   │   │   ├── fuse-search-engine.test.ts # Intent ranking and typo tests
│   │   │   └── search-engine.ts        # SearchEngine interface contract
│   │   ├── tool-registry.ts            # Static tool manifest registry & invariants
│   │   └── tool-registry.test.ts       # Registry invariant tests
│   ├── contracts/                      # TypeScript DTOs and contracts
│   │   ├── drop-server.ts              # Drop server request/snapshot/event types
│   │   ├── env-scrubber.ts             # Scrubber result, diagnostics & constants
│   │   ├── errors.ts                   # AppCommandError & CommandErrorCode
│   │   ├── index.ts                    # Contracts barrel export
│   │   └── tools.ts                    # ToolManifest & ToolSearchHit interfaces
│   ├── foundation/                     # Truly shared workbench primitives
│   │   ├── clipboard/
│   │   │   ├── index.ts                # Narrow copyText wrapper
│   │   │   └── clipboard.test.ts       # Clipboard tests
│   │   └── ui/
│   │       ├── ToolPageHeader.tsx      # Standard tool header with origin back navigation
│   │       ├── ToolPageHeader.test.tsx # Header navigation tests
│   │       └── index.ts
│   ├── tools/
│   │   ├── drop-server/                # Vertical slice: LAN Drop Server
│   │   │   ├── DropServerPage.tsx      # Drop Server workbench UI
│   │   │   ├── DropServerPage.test.tsx # Drop Server UI component tests
│   │   │   ├── api.ts                  # Tauri command & event invocation wrapper
│   │   │   ├── formatters.ts           # Byte & timestamp formatters
│   │   │   ├── formatters.test.ts      # Formatter unit tests
│   │   │   └── manifest.ts             # Drop Server tool manifest
│   │   └── env-scrubber/               # Vertical slice: Env Scrubber
│   │       ├── EnvScrubberPage.tsx     # Resizable dual-pane UI with diagnostics
│   │       ├── EnvScrubberPage.test.tsx# Scrubber UI component tests
│   │       ├── manifest.ts             # Env Scrubber tool manifest
│   │       ├── scrubber.ts             # Format-aware source scanner (pure TS)
│   │       └── scrubber.test.ts        # Table-driven test matrix (23 tests)
│   ├── index.css                       # Workbench design system tokens & theme variables
│   ├── main.tsx                        # Application mount entrypoint
│   └── test-setup.ts                   # Vitest DOM & ResizeObserver environment setup
└── src-tauri/
    ├── Cargo.toml                      # Rust dependencies & optimization profiles
    ├── capabilities/
    │   └── main.json                   # Tauri capability configuration
    ├── src/
    │   ├── error.rs                    # AppError & AppCommandError typed mappings
    │   ├── foundation/
    │   │   ├── mod.rs
    │   │   └── network.rs              # IPv4 eligibility & RFC1918 classification
    │   ├── lib.rs                      # Tauri runtime builder & plugin registration
    │   ├── main.rs                     # Desktop process binary entrypoint
    │   └── tools/
    │       ├── mod.rs
    │       └── drop_server/
    │           ├── commands.rs         # Tauri IPC command handlers & event listener
    │           ├── contracts.rs        # Rust constants, DTOs & lifecycle enums
    │           ├── filename.rs         # Filename sanitization & collision resolution
    │           ├── http.rs             # Axum HTTP router, multipart streaming & HTML
    │           ├── manager.rs          # DropServerManager lock & lifecycle transitions
    │           └── mod.rs
    └── tauri.conf.json                 # Tauri window, security & build bundle config
```

---

## 3. Resolved Key Dependency Versions

| Component | Technology | Version |
|---|---|---|
| Package Manager | Bun | `1.4.0` |
| UI Framework | React | `19.1.0` |
| DOM Renderer | React DOM | `19.1.0` |
| Client Router | React Router | `7.18.4` |
| Bundler & Dev Server | Vite | `8.0.16` |
| Styling | Tailwind CSS | `4.3.3` |
| Search Engine | Fuse.js | `7.5.0` |
| Resizable Panels | react-resizable-panels | `4.12.4` |
| UI Icons | Lucide React | `1.48.0` |
| Test Runner | Vitest | `5.0.1` |
| DOM Testing | Testing Library React / Jest DOM | `16.3.3` / `7.0.1` |
| Desktop Framework | Tauri Core & CLI | `2.x` (`2.12.0`) |
| Rust Toolchain | Rust / Cargo | `1.98.1` |
| HTTP Server | Axum | `0.8.9` |
| Async Runtime | Tokio | `1.x` |
| Cancellation Tokens | Tokio-Util | `0.7.19` |
| HTTP Limits | Tower-HTTP | `0.7.1` |
| Network Enumeration | local-ip-address | `0.6.13` |
| Path Sanitization | sanitize-filename | `0.6.0` |
| Temporary Files | tempfile | `3.27.0` |
| Error Handling | thiserror | `2.0.21` |
| Serialization | Serde / Serde JSON | `1.x` |

---

## 4. Tauri Permissions & Capability Configuration

Configured in `src-tauri/capabilities/main.json`:
- **Window Target**: Scoped strictly to `"main"`.
- **Active Permissions**:
  - `core:default`: Basic window and application lifecycle handling.
  - `dialog:allow-open`: Directory selection for Drop Server destination.
  - `clipboard-manager:allow-write-text`: Copy URL and scrubbed output to clipboard.
- **Explicit Exclusions**:
  - **No `clipboard-manager:allow-read-text`**: Programmatic clipboard reads are forbidden.
  - **No `fs:*` plugin permissions**: The Tauri FS plugin is not enabled for the WebView. All writes are mediated by privileged Rust commands.
  - **No remote origins**: Remote origin IPC invocation is completely disabled.

---

## 5. Drop Server Limits & HTTP Routes

Defined in `src-tauri/src/tools/drop_server/contracts.rs`:

| Limit / Constant | Value | Purpose |
|---|---|---|
| `MAX_UPLOAD_REQUEST_BYTES` | 2 GiB (`2,147,483,648` bytes) | Enforced on entire multipart body via `RequestBodyLimitLayer` |
| `MAX_FILES_PER_REQUEST` | 32 files | Bounded file count per request |
| `MAX_FILENAME_BYTES` | 240 bytes | Preserves extension and valid UTF-8 character boundaries |
| `COLLISION_ATTEMPTS_MAX` | 10,000 attempts | Upper bound for rename resolution (`photo (1).jpg`) |
| `RECENT_UPLOAD_CAPACITY` | 50 records | In-memory upload history bound |
| `STOP_TIMEOUT` | 2 seconds | Graceful cancellation timeout before forced task abort |
| `MIN_VALID_PORT` / `MAX_VALID_PORT` | `1024` / `65535` | Valid fixed port range |

### HTTP Routes (Exposed only when server is active)
- `GET /`: Upload form (self-contained HTML with `nosniff` and restrictive CSP).
- `POST /upload`: Streaming multipart handler writing to disk.
- `GET /healthz`: Simple probe returning `200 OK` with text `"ok"`.
- `*`: 404 fallback.
- **Strictly omitted**: No file listing, no file download routes, and no CORS layer.

---

## 6. Automated Test Summary

| Test Suite | File Count | Tests Passed | Tests Failed | Status |
|---|---|---|---|---|
| Frontend Vitest Suite | 10 files | 68 | 0 | PASS |
| Rust Unit & Integration Suite | 1 crate (`dao_lib`) | 16 | 0 | PASS |
| **Total Automated Tests** | **11 suites** | **84** | **0** | **PASS** |

### Quality Command Results
- `bun run typecheck`: Passed (0 errors).
- `bun run test`: Passed (68/68 passed in 1.7s).
- `bun run build`: Passed (production bundle built in ~240ms).
- `cargo fmt -- --check`: Passed (clean formatting).
- `cargo clippy --all-targets --all-features -- -D warnings`: Passed (0 warnings).
- `cargo test`: Passed (16/16 passed in 0.02s).

---

## 7. Manual LAN Smoke-Test Status

- **Status**: `pending human test`
- **Context**: Localhost integration tests (`GET /`, `POST /upload`, `GET /healthz`, collision handling, file persistence) pass automatically. Physical cross-device smoke testing (connecting a smartphone or second computer on the same physical Wi-Fi network to the rendered URL) must be validated by the human operator on their physical network.

---

## 8. Potential Future Tool Extensions (Notes Only)

Without modifying current architecture or expanding V0 scope, future workbench tools can be added following `.agents/skills/tool-authoring/SKILL.md`:

1. **Port Inspector** (`network` category):
   - Check whether a given port is currently open or occupied by another process before starting local dev servers, with optional process name resolution via a narrow Rust command.
2. **QR Code Generator** (`text` / `network` category):
   - Render SVG or canvas QR codes for LAN URLs or arbitrary text in pure TypeScript to streamline transferring links to mobile devices.
3. **JWT / Token Inspector** (`developer` / `text` category):
   - Parse and pretty-print JWT headers and payloads client-side with expiration timestamps and signature algorithm indicators, completely local with zero network calls.
4. **Checksum & Hash Utility** (`files` / `developer` category):
   - Compute SHA-256 and MD5 hashes for dropped files or pasted text using a streaming Rust command or Web Crypto API.
