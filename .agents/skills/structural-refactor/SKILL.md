---
name: structural-refactor
description: Refactor by semantic responsibility while preserving behavior; avoid interface inflation and speculative layers.
---

# Structural refactoring

Refactor around semantic boundaries, not file-length thresholds.

## Rules

- Separate feature work from broad structural refactors whenever practical.
- Preserve behavior first; verify before and after.
- Extract a module when it has a coherent responsibility, not merely because a file is long.
- Avoid one-method interfaces and indirection that has no second implementation or meaningful test seam.
- Do not create repositories, services, factories, adapters or event buses just to imitate DDD vocabulary.
- Keep tool-specific code inside the tool.
- Promote code to `foundation/` only when it is genuinely system-level or reused by at least two tools with the same semantics.
- Prefer a few explicit modules over a large abstraction hierarchy.
- Refactor in small verifiable commits/steps.
