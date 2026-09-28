# Tauri Developer Workbench — Implementation Pack

This directory is meant to be copied **at the root of a freshly initialized Tauri project**.

It is deliberately a specification + agent-control pack, not generated application code. The point is to let a coding LLM build the application in small, contract-locked passes without inventing architecture on the fly.

## Working product description

A local-first desktop developer workbench built with Tauri. The `/` screen is a searchable launcher made of tool tiles. Each tool is an independent vertical slice. V0 contains:

1. **LAN Drop Server** — receive files from another device on the same reachable IPv4 network.
2. **Env Scrubber** — remove values from dotenv-style text while preserving the useful source representation.

The final product name is intentionally undecided. Do not encode `Tori`, `Tauri Toolbox`, or any provisional brand into domain namespaces.

## Recommended initialization

Create the base project first:

```bash
bun runcreate tauri-app
```

Choose:

- TypeScript / JavaScript
- bun
- React
- TypeScript

Then copy this pack into the repository root.

## How to use this pack with a coding LLM

Do **not** give every implementation task at once.

Give these files one by one, in this order:

1. `handoff/00_BOOTSTRAP.md`
2. `handoff/01_APP_SHELL.md`
3. `handoff/02_DROP_SERVER.md`
4. `handoff/03_ENV_SCRUBBER.md`
5. `handoff/04_HARDENING.md`
6. `handoff/05_FINAL_REVIEW.md`

Each handoff tells the agent which architecture documents and skills it must read before touching code.

The agent must also obey the root `AGENTS.md` on every pass.

## Core philosophy

- Modular monolith, not plugin platform.
- Vertical slices, not layer theatre.
- DDD-light: meaningful boundaries and invariants, not aggregate/repository ceremony.
- Pure transformations stay TypeScript unless there is a concrete reason otherwise.
- OS/network/filesystem capabilities belong in Rust/Tauri.
- Shared code is promoted to `foundation/` only after it is actually shared or clearly system-level.
- No speculative abstractions.
- No silent fallbacks at system boundaries.
- No filesystem read/write permission exposed to the WebView when Rust can own the operation.
- V0 search is intent-aware lexical/fuzzy search; no AI/embedding dependency.

## Documents

Start with `docs/00_INDEX.md`.

## Research snapshot

The technical research behind this pack was refreshed on **2026-09-28**. See `docs/13_RESEARCH_SOURCES.md` for source links, observed versions, and versioning policy.
