---
name: defensive-programming
description: Apply assertion-heavy, bounded, explicit defensive programming to parsers, network/filesystem boundaries, lifecycle state, and other failure-prone code.
---

# Defensive programming

Apply this skill strongly to:

- multipart/network input
- path and filename handling
- port/interface selection
- server lifecycle state
- dotenv scanning
- serialization boundaries

Apply it lightly to ordinary presentational React code.

## Rules

1. State preconditions, postconditions and invariants where they materially prevent invalid states.
2. Reject impossible or invalid states early rather than letting them drift downstream.
3. Bound all externally influenced work: bytes, file count, filename length, retry count, stored history, text size.
4. Use strong types/discriminated unions instead of booleans whose combinations can become invalid.
5. Parse boundary input once into a valid internal representation.
6. Do not silently recover by changing user intent. Fixed port occupied => explicit error.
7. Prefer atomic operations over check-then-act races. Auto port => bind port `0`; collision-safe final file => atomic no-clobber persist.
8. Errors must have stable machine-readable codes plus human-readable messages.
9. Cleanup must be designed, not hoped for. Cancellation/failure must not leave partially completed files presented as successful.
10. Keep functions small enough that resource ownership and invariants are visible.
11. Treat warnings from Rust clippy/TypeScript as defects during final verification.

## Negative-space review

Before finishing a system-facing change, ask:

- What can an untrusted peer make arbitrarily large?
- What can race?
- What can remain half-created after cancellation?
- What can be called twice?
- What does the UI believe when the underlying resource has failed?
- What permission did we grant that the feature does not require?
