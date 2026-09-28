# dao

A local-first desktop developer workbench built with Tauri, React, TypeScript, and Rust.

## Tools (V0)

- **LAN Drop Server** — Receive files over the local network via temporary embedded HTTP upload endpoint.
- **Env Scrubber** — Sanitize dotenv assignments while preserving structure, keys, and comments.

## Development

```bash
bun install
bun run dev
bun run tauri dev
```

## Quality Checks

```bash
bun run typecheck
bun run test
bun run build
cd src-tauri && cargo fmt -- --check
cd src-tauri && cargo clippy --all-targets --all-features -- -D warnings
cd src-tauri && cargo test
```

## Authorship

[commodore64.dev](https://commodore64.dev)
