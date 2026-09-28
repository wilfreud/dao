---
name: spec-locked-tdd
description: Use contract-first, behavior-focused TDD for parsers, state transitions, search behavior, and system boundaries.
---

# Spec-locked TDD

The contract is fixed before implementation. Tests express the contract; implementation then earns green status.

## Loop

1. **Shape** — identify observable behavior, invariants, error cases and boundaries.
2. **Select** — choose one behavior slice.
3. **RED** — write the smallest test proving the behavior is not implemented.
4. **LOCK** — confirm the test represents the written spec; do not weaken it during implementation.
5. **GREEN** — implement only enough to satisfy the behavior.
6. **REFACTOR** — improve structure without changing the locked behavior.
7. **VERIFY** — run relevant focused tests plus the surrounding suite.

## High-value test targets in this repository

- dotenv scanner edge cases
- search ranking/intents
- port/lifecycle validation
- IPv4 candidate filtering
- filename sanitization/collision policy
- upload request limits and no-overwrite behavior
- typed command error mapping

Do not force TDD onto CSS spacing or trivial component plumbing.

Do not modify a failing specification test merely to make GREEN easier. If the spec is actually wrong, stop and change the written contract intentionally before changing the test.
