# Test strategy

Use risk-based tests, not coverage theatre.

## TypeScript unit tests — required

### Search

Lock behaviors such as:

- empty query returns all tools;
- `receive a file from my iphone` ranks Drop Server above Env Scrubber;
- `remove passwords from env` ranks Env Scrubber above Drop Server;
- typo-tolerant token query still finds intended tool;
- duplicate registry IDs/routes are rejected.

### Env scrubber

Use table-driven tests covering the full matrix in `07_ENV_SCRUBBER_SPEC.md`.

Test source representation explicitly, including CRLF and comments.

## React tests — focused only

Test user-visible interaction that can regress:

- launcher filters/ranks tiles;
- back navigation returns to launcher;
- Drop Server controls disable appropriately by lifecycle;
- diagnostics prevent a misleading clean/safe presentation;
- copy button invokes the narrow clipboard wrapper.

Do not snapshot huge DOM trees or test Tailwind class strings unless the class itself is contractual.

## Rust unit tests — required

High-value pure helpers:

- IPv4 eligibility/private classification;
- fixed port validation;
- filename normalization/sanitization;
- collision candidate naming;
- bounded recent-history behavior;
- error-to-command-code mapping;
- lifecycle transition guard helpers.

## Rust integration tests — required for Drop Server

Run the real listener on `127.0.0.1:0` in tests even though production excludes loopback from selectable user interfaces. Loopback is appropriate for isolated integration testing.

Use `reqwest` dev dependency.

Scenarios:

1. GET `/healthz` => 200.
2. GET `/` => upload form.
3. POST one small multipart file => persisted bytes exactly match.
4. two files => both persist.
5. existing filename => no overwrite + collision-safe second name.
6. traversal filename => cannot escape temp destination.
7. over-limit request => rejected.
8. malformed multipart => client error.
9. stop token => listener terminates within timeout.
10. completed upload emits/adds expected record.

Where practical, separate HTTP/router tests from Tauri command tests so most server behavior can run without a WebView runtime.

## Manual acceptance smoke test

On the actual Mac:

1. start app;
2. confirm launcher shows both tools;
3. start Drop Server on Wi-Fi interface + 8090;
4. from another device on same LAN, open URL and upload a file;
5. confirm exact file arrives;
6. stop server and confirm URL no longer responds;
7. start auto-port mode and verify copied URL uses returned port;
8. scrub a realistic `.env` with comments/quotes and visually inspect output.

The agent should not claim LAN interoperability without this manual device smoke test. Automated localhost tests are necessary but not equivalent to the LAN path/firewall.

## Quality commands

Target final set:

```bash
bun run typecheck
bun run test
bun run build

cd src-tauri
cargo fmt -- --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
```
