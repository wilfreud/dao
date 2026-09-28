# Handoff 00 — Bootstrap the repository and architecture

Implement only this stage. Do not implement the Drop Server or Env Scrubber behavior yet.

## Read first

- `AGENTS.md`
- `.agents/skills/structural-refactor/SKILL.md`
- `.agents/skills/tauri-boundaries/SKILL.md`
- `.agents/skills/ui-workbench/SKILL.md`
- `docs/01_PRODUCT_SCOPE.md`
- `docs/02_ARCHITECTURE.md`
- `docs/03_STACK_AND_DEPENDENCIES.md`
- `docs/04_CONTRACTS.md`
- `docs/08_SECURITY.md`

## Objective

Turn the fresh create-tauri-app React/TypeScript repository into the minimal verified foundation for the workbench.

## Tasks

1. Inspect the scaffold before changing versions. Preserve its compatible Tauri core/API/CLI versions.
2. Install official plugins with:
   - `bun runtauri add dialog`
   - `bun runtauri add clipboard-manager`
3. Install the frontend/Rust dependencies specified in `docs/03_STACK_AND_DEPENDENCIES.md`.
4. Configure Tailwind 4 through the Vite plugin if the scaffold does not already have it.
5. Add test/typecheck scripts if missing.
6. Create the architectural directories needed now, but do not create empty ceremonial layer directories.
7. Configure the narrow main capability:
   - core default;
   - dialog open only;
   - clipboard write-text only.
   Remove broader default plugin permissions added by installers if unnecessary.
8. Register the two Tauri plugins in Rust.
9. Create shared TypeScript contract definitions for tool manifests/search and the Drop Server DTOs from `docs/04_CONTRACTS.md`; no implementation yet.
10. Create a minimal `foundation/clipboard` wrapper exposing only `copyText(text)` through the Tauri write-text API.
11. Create basic app CSS variables/base typography consistent with `docs/10_DESIGN_SYSTEM.md`, without building the launcher yet.
12. Ensure Vite ignores `src-tauri/**` for dev watching if appropriate for the installed Vite/Tauri setup.

## Do not

- add fs/store/opener plugins;
- add shadcn/Radix;
- add Zustand/Redux;
- create a database;
- build a generic plugin runtime;
- implement server or env scanner;
- rename the app to Tori.

## Verification

Run and fix until green:

```bash
bun runtypecheck
bun runtest
bun runbuild
cd src-tauri && cargo fmt -- --check
cd src-tauri && cargo clippy --all-targets --all-features -- -D warnings
cd src-tauri && cargo test
```

Also run `bun runtauri dev` long enough to verify the empty shell boots.

## Completion report

Return:

- files changed;
- installed dependency versions actually resolved in lockfiles;
- final Tauri capability permissions;
- checks run and their result;
- any divergence from the spec with a concrete reason.
