---
name: tool-authoring
description: Add a new workbench tool as a small vertical slice without leaking tool-specific behavior into the app shell or foundation.
---

# Tool authoring

A tool is a self-contained capability reachable from the launcher.

## Minimum tool anatomy

A trivial pure-TS tool may contain only:

```text
src/tools/<tool-id>/
  manifest.ts
  <domain-logic>.ts
  <ToolPage>.tsx
  <domain-logic>.test.ts
```

A system-facing tool may additionally contain application/infrastructure code and a matching Rust module.

Do not create empty `domain/`, `application/`, `infrastructure/` directories just to satisfy a pattern.

## Required steps

1. Define the user-visible job in one sentence.
2. Define a `ToolManifest` with stable `id`, route, description and search metadata.
3. Define behavioral invariants and input/output/error contracts.
4. Decide whether behavior is pure TS or requires Rust/Tauri.
5. Implement tests appropriate to the risk.
6. Register the manifest in the static tool registry.
7. Ensure launcher search can find the tool through name, aliases and intent/example phrases.
8. Keep the tool independently removable without breaking unrelated tools.

## Foundation promotion test

Before moving code to `foundation/`, all of the following should be true:

- the responsibility is not domain-specific to one tool;
- the semantics are stable;
- another tool actually uses it, or it is clearly an app-wide system primitive (for example clipboard UI affordance);
- moving it reduces coupling rather than hiding it.
