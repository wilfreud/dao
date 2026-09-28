# Handoff 02 — Implement LAN Drop Server

This is a system-facing feature. Use contract-first defensive implementation.

## Read first

- `AGENTS.md`
- `.agents/skills/defensive-programming/SKILL.md`
- `.agents/skills/spec-locked-tdd/SKILL.md`
- `.agents/skills/tauri-boundaries/SKILL.md`
- `.agents/skills/tool-authoring/SKILL.md`
- `docs/04_CONTRACTS.md`
- `docs/06_DROP_SERVER_SPEC.md`
- `docs/08_SECURITY.md`
- `docs/09_TEST_STRATEGY.md`
- `docs/10_DESIGN_SYSTEM.md`

## Objective

Implement the Drop Server end to end without expanding its V0 scope.

## Order of work

### A. Lock pure Rust behavior first

Write tests for:

- IPv4 eligibility/private classification;
- port validation;
- lifecycle transition rules;
- filename basename/sanitization;
- collision naming;
- history cap;
- error-code mapping.

### B. Network enumeration command

Implement `network_list_ipv4_interfaces` exactly per contract.

### C. HTTP server independently of Tauri UI

Build Axum router/server with:

- GET `/`;
- POST `/upload`;
- GET `/healthz`;
- 404 fallback;
- request size bound;
- streamed multipart writes;
- temp-file + no-clobber persistence;
- bounded file count;
- escaped HTML responses;
- cancellation token.

Write real localhost integration tests before UI integration.

### D. DropServerManager + Tauri commands

Implement:

- `drop_server_start`;
- `drop_server_stop`;
- `drop_server_status`;
- low-frequency upload/server events.

Respect lifecycle and locking rules. Never hold the manager lock across `.await`.

### E. UI

Implement:

- interface selector;
- fixed 8090 / auto mode;
- destination folder picker;
- start/stop;
- running URL + Copy;
- explicit lifecycle;
- recent uploads;
- concise exposure warning.

The UI must initialize from Rust status and react to events; React state is not resource truth.

## Forbidden shortcuts

- binding `0.0.0.0` instead of selected interface;
- checking a random port then later binding it;
- buffering entire file to memory;
- trusting multipart filename as path;
- overwriting existing files;
- exposing destination path to remote HTTP page;
- enabling CORS "just in case";
- enabling Tauri fs permissions;
- swallowing server errors and showing Running;
- adding auth/download/listing in this handoff.

## Verification

Run all automated checks from `docs/09_TEST_STRATEGY.md`.

Perform localhost integration tests. If a second physical LAN device is not available to the coding agent, explicitly state that the cross-device smoke test remains for the human owner; do not fake that result.

## Completion report

Include:

- command signatures actually implemented;
- limits/constants;
- security behavior;
- integration tests;
- checks run;
- any known OS/firewall caveat.
