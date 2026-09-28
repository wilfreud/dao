# Architecture

## Style

Use a **modular monolith with vertical tool slices** and a thin app shell.

This is DDD-light: responsibilities, boundaries, states and contracts matter; ceremonial DDD layers do not.

## Target repository shape

```text
src/
  app/
    App.tsx
    router.tsx
    tool-registry.ts
    launcher-state.tsx
    search/
      search-engine.ts
      fuse-search-engine.ts
  foundation/
    clipboard/
    ui/
  tools/
    drop-server/
      manifest.ts
      contracts.ts
      api.ts
      DropServerPage.tsx
      components/
      tests/
    env-scrubber/
      manifest.ts
      scrub-env.ts
      EnvScrubberPage.tsx
      scrub-env.test.ts
  shared/
    # Prefer not to create this until there is genuinely shared non-foundation code.

src-tauri/src/
  lib.rs
  error.rs
  foundation/
    mod.rs
    network.rs
  tools/
    mod.rs
    drop_server/
      mod.rs
      commands.rs
      manager.rs
      http.rs
      upload.rs
      filename.rs
      contracts.rs

src-tauri/capabilities/
  main.json

.agents/
docs/
handoff/
AGENTS.md
```

The exact file split may evolve after implementation. Semantic responsibility takes priority over matching the tree literally.

## App shell responsibilities

The shell owns only:

- routing;
- launcher session state;
- static tool registry;
- tool search;
- generic visual primitives that are truly app-wide.

It does **not** know how a tool works.

## Tool boundary

Each tool owns:

- manifest metadata;
- tool-specific UI;
- tool-specific state/logic;
- tests;
- matching Rust modules if privileged capabilities are needed.

Deleting a tool directory plus its registry entry should not require rewriting another tool.

## Foundation boundary

V0 foundation should remain small.

Expected candidates:

- `foundation/clipboard`: a narrow copy-text affordance around the Tauri clipboard plugin.
- `foundation/ui`: stable workbench primitives such as `ToolPageHeader`, `CopyButton`, status badge, resizable workspace wrapper.
- Rust `foundation/network`: machine IPv4 enumeration/filtering shared by future network tools.

Do **not** create `filesystem`, `settings`, or other foundation modules until a real use requires them. The drop server's destination/file logic remains inside the drop-server tool initially.

## Why static registration

The registry is compile-time TypeScript data. That gives:

- discoverability;
- search metadata;
- routing metadata;
- categories/icons;
- one predictable extension point.

It avoids runtime plugin loading, versioned plugin APIs, code signing boundaries, dynamic module loading and plugin security policy.

## Rust boundary

The WebView should never directly own the listener or upload filesystem writes.

```text
React tool UI
    ↓ invoke typed command
Tauri command adapter
    ↓
DropServerManager / network module
    ↓
Tokio + Axum + filesystem
```

The command layer is an adapter. It should not contain the entire business implementation.

## Concurrency/lifecycle rule

Never hold a shared state lock across `.await` or blocking filesystem/network I/O.

For server start/stop:

1. validate/transition state under lock;
2. release lock;
3. perform bind/start/stop work;
4. reacquire lock;
5. publish reconciled state.

## State ownership

React owns presentational/session state.

Rust owns truth about privileged resources. The UI asks `drop_server_status` when entering the page and reconciles events into its view; it must not assume the resource is alive merely because a previous React state said so.
