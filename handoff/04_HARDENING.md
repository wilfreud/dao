# Handoff 04 — Hardening and integration cleanup

Do not add new product features.

## Read first

- `AGENTS.md`
- `.agents/skills/defensive-programming/SKILL.md`
- `.agents/skills/structural-refactor/SKILL.md`
- `docs/02_ARCHITECTURE.md`
- `docs/04_CONTRACTS.md`
- `docs/08_SECURITY.md`
- `docs/09_TEST_STRATEGY.md`
- `docs/12_DECISIONS.md`

## Objective

Review the now-functional V0 for boundary/security/state correctness and remove accidental architectural debt introduced during feature implementation.

## Checklist

1. Audit Tauri capability files:
   - no remote origins;
   - dialog open only;
   - clipboard write-text only;
   - no fs plugin permission.
2. Audit Rust commands:
   - stable typed errors;
   - no raw panic/debug error crossing boundary;
   - no locks held across await;
   - no impossible lifecycle snapshots.
3. Audit upload path:
   - bounded bytes/files/filename/retries/history;
   - no traversal;
   - no overwrite;
   - temp cleanup on failure;
   - HTML escaping;
   - no file download/list routes;
   - no CORS.
4. Audit event listeners for cleanup.
5. Audit Env Scrubber diagnostics against false-safe output.
6. Audit dependencies and remove unused packages/crates.
7. Refactor only where semantic boundaries became clear; do not create speculative interfaces/layers.
8. Ensure source files use the provisional-generic project language rather than hardcoded `Tori` branding.
9. Add concise comments only where they protect an invariant or explain a non-obvious security/concurrency choice.

## Verification

Run the entire quality command set. Fix warnings.

Report every permission currently enabled and every externally reachable HTTP route.
