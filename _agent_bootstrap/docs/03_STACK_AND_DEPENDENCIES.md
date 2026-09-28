# Stack and dependencies

Research snapshot: **2026-09-28**.

## Versioning policy

Initialize with the current official Tauri scaffold and let it choose a mutually compatible Tauri core/CLI/API set.

Tauri is actively releasing: at research time the Rust crate documentation already exposed Tauri 2.12.0 while indexed JS/plugin packages were not perfectly synchronized. Therefore:

- **Do not overwrite scaffolded Tauri core versions with this document.**
- Install official Tauri plugins through `bun runtauri add ...` so the CLI performs the integration.
- Pin/choose application dependencies by compatible stable major/minor, then keep the lockfiles committed.
- Never use prerelease `3.0.0-alpha` packages for V0.

## Base stack

- Tauri 2
- Rust stable (current Tauri 2.12 requires Rust >= 1.90; use the requirement produced by the scaffold you actually install)
- React 19
- TypeScript
- Vite
- bun
- Tailwind CSS 4

## Frontend runtime dependencies

Install after scaffold:

```bash
bun runadd react-router@7.18.4 \
  fuse.js@7.5.0 \
  react-resizable-panels@4.12.4 \
  lucide-react@1.48.0
```

Why React Router 7 instead of the newly released 8.x line: V0 needs only stable SPA/hash routing; the older maintained major reduces unnecessary migration surface. Re-evaluate later, do not upgrade just for novelty.

### Official Tauri plugins

```bash
bun runtauri add dialog
bun runtauri add clipboard-manager
```

Use:

- dialog: destination folder selection only;
- clipboard-manager: write text only.

Do not install Tauri FS/store/opener plugins in V0 unless a later feature demonstrates a real need.

## Frontend dev dependencies

If not already present from the scaffold:

```bash
bun runadd -D tailwindcss@4.3.3 \
  @tailwindcss/vite@4.3.3 \
  vitest@5.0.1 \
  jsdom \
  @testing-library/react@16.3.3 \
  @testing-library/jest-dom
```

Use the scaffolded React, React DOM, TypeScript, Vite, Tauri API and Tauri CLI versions rather than forcing snapshot versions.

Observed during research for context only:

- React 19.3.0
- TypeScript 7.0.2
- Vite 8.3.1
- `@vitejs/plugin-react` 6.1.1
- `@tauri-apps/api` 2.11.1 in npm index
- `@tauri-apps/cli` 2.11.5 in npm index

## Rust runtime dependencies

Run inside `src-tauri/` after the scaffold/plugins exist:

```bash
cargo add axum@0.8.9 --features multipart
cargo add tokio@1 --features rt-multi-thread,macros,net,fs,io-util,sync,time
cargo add tokio-util@0.7.19 --no-default-features --features rt
cargo add tower-http@0.7.1 --features limit
cargo add serde@1 --features derive
cargo add thiserror@2.0.21
cargo add local-ip-address@0.6.13
cargo add sanitize-filename@0.6.0
cargo add tempfile@3.27.0
```

### Why each crate exists

| Crate | Responsibility |
|---|---|
| `axum` | tiny embedded HTTP router and multipart extraction |
| `tokio` | async listener, server task, async filesystem writes, synchronization |
| `tokio-util` | `CancellationToken` for explicit server shutdown |
| `tower-http` | bounded request body layer; no CORS layer needed |
| `serde` | Tauri command/event DTO serialization |
| `thiserror` | internal typed Rust errors |
| `local-ip-address` | enumerate named local IPv4 interfaces cross-platform |
| `sanitize-filename` | baseline unsafe filename character removal; still apply our own basename/length/collision policy |
| `tempfile` | same-directory temporary upload file with cleanup-on-drop semantics before atomic/no-clobber persistence |

`tokio-util::sync::CancellationToken` is gated by the `rt` feature, hence that explicit feature.

## Rust dev dependencies

For real HTTP integration tests:

```bash
cargo add --dev reqwest@0.13.5 --no-default-features --features multipart
```

`tempfile` is already a runtime dependency and can also be used in tests for temporary destination directories.

## Dependencies intentionally NOT installed

### `dotenv`

Do not install it for the scrubber. Its normal parser returns key/value data and normalizes line endings; the tool must preserve source representation. We implement a small bounded scanner based on the documented/source syntax instead.

### shadcn/Radix

Do not install a component suite just to get buttons/cards. Start with local semantic components + Tailwind. Add a focused primitive library only when a real interaction needs it.

### global state library

Not needed. Launcher session state can live in a small React context; tool state remains local.

### Tauri filesystem plugin

Not needed for V0. Upload filesystem writes happen in Rust; exposing generic WebView file APIs would broaden permissions.

### CORS middleware

Not needed. The upload form is served by the same embedded HTTP origin that receives its POST.

## Suggested package scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "tauri": "tauri"
  }
}
```

Adapt to the scaffold rather than duplicating existing scripts.
