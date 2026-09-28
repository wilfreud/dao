# Adding a new tool

Use this process once V0 foundations exist.

## 1. State the job

One sentence:

> Given X, let the user do Y, producing Z.

If the sentence contains multiple independent jobs, consider multiple tools.

## 2. Decide the boundary

Ask:

- Is this a pure deterministic transformation? => TypeScript.
- Does it need OS/network/filesystem/process privileges? => Rust/Tauri boundary.
- Is there already a foundation primitive with identical semantics? => reuse it.
- Is this the first use? => keep it inside the tool unless clearly app-wide.

## 3. Write the manifest

Include enough natural-language metadata that launcher search can discover the intent without AI.

## 4. Define contract + invariants

Document:

- inputs;
- outputs;
- errors;
- limits;
- state transitions if stateful;
- destructive/security behavior.

## 5. Select tests by risk

Parser/algorithm => table-driven unit tests.

OS boundary => focused integration tests.

UI => interaction/behavior tests only where valuable.

## 6. Implement the smallest slice

Avoid pre-building future settings, persistence, event buses or abstractions.

## 7. Register the tool

Static import into the tool registry.

## 8. Review foundation pressure

Only after implementation, look for genuinely duplicated/stable primitives. Promote carefully.

## Tool removal test

A healthy tool slice should be removable by deleting its tool folder(s), Rust module if any, tests, and one registry entry, without unrelated feature surgery.
