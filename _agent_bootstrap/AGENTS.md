# Repository instructions

This repository is a local-first desktop developer workbench built with Tauri + React + TypeScript + Rust.

The application is intentionally small and personal. Do not turn it into an enterprise platform, a generic plugin runtime, or a framework inside a framework.

## Read before coding

Always read the implementation handoff supplied by the user first.

Then read the documents it references. If unsure, read:

- `docs/01_PRODUCT_SCOPE.md`
- `docs/02_ARCHITECTURE.md`
- `docs/04_CONTRACTS.md`
- `docs/08_SECURITY.md`

## Skills

Apply these project skills when relevant:

- `.agents/skills/defensive-programming/SKILL.md`
- `.agents/skills/spec-locked-tdd/SKILL.md`
- `.agents/skills/structural-refactor/SKILL.md`
- `.agents/skills/tool-authoring/SKILL.md`
- `.agents/skills/tauri-boundaries/SKILL.md`
- `.agents/skills/ui-workbench/SKILL.md`

## Architectural laws

1. **A tool is a vertical slice.** Tool-specific behavior stays inside the tool.
2. **Foundation is earned.** Do not move code into `foundation/` merely because it might be reused later.
3. **No generic plugin system in V0.** Tool registration is static and compile-time.
4. **Rust owns privileged/system-facing behavior.** Network listeners, filesystem writes, OS interaction and lifecycle-sensitive resources belong behind Tauri commands.
5. **TypeScript owns pure transformations and presentation.** The env scrubber and launcher search are pure TS.
6. **The Tauri command boundary is a real API.** DTOs, error codes and command names are contracts. Do not casually change them.
7. **Do not swallow errors or silently choose another behavior.** A requested occupied fixed port is an error; do not auto-select a different one.
8. **Do not hold a mutex across blocking I/O or an `.await`.** Extract state/handles, release lock, perform work, then reconcile state.
9. **No unbounded work from untrusted input.** Bound upload bytes, files/request, recent history, env input size, retries, and scans.
10. **No broad WebView permissions.** Prefer the narrowest Tauri capability identifiers.
11. **No `utils/` dumping ground.** Name modules by responsibility.
12. **Do not add dependencies for trivial code.** Every dependency must solve a concrete problem better than a small local implementation.

## Coding style

- TypeScript: strict mode; discriminated unions for state/variants; readonly where useful.
- Rust: typed errors; explicit state transitions; narrow functions; avoid panics for recoverable runtime conditions.
- React: keep business logic outside render functions; accessible controls; no implementation-detail-heavy tests.
- Prefer composition over deep component abstraction.

## Verification before declaring a handoff complete

Run the relevant checks and report their actual result:

```bash
bun runtypecheck
bun runtest
bun runbuild
cd src-tauri && cargo fmt -- --check
cd src-tauri && cargo clippy --all-targets --all-features -- -D warnings
cd src-tauri && cargo test
```

If scripts do not yet exist, create the smallest sensible scripts during bootstrap.

Never claim a check passed if it was not run.
