# Handoff 06 — Implement Port Inspector

Implement the Port Inspector tool described in `docs/14_PORT_INSPECTOR_SPEC.md`.

## Read first

Read these files before modifying code:

1. `AGENTS.md`
2. `.agents/skills/tool-authoring/SKILL.md`
3. `.agents/skills/defensive-programming/SKILL.md`
4. `.agents/skills/tauri-boundaries/SKILL.md`
5. `.agents/skills/spec-locked-tdd/SKILL.md`
6. `.agents/skills/ui-workbench/SKILL.md`
7. `docs/02_ARCHITECTURE.md`
8. `docs/04_CONTRACTS.md`
9. `docs/08_SECURITY.md`
10. `docs/09_TEST_STRATEGY.md`
11. `docs/14_PORT_INSPECTOR_SPEC.md`
12. `docs/16_TOOLING_ADDENDUM.md`

## Objective

Add `/tools/port-inspector` and register it in the home tool registry/search.

The normal inspection path must use Rust OS APIs through `netstat2`/`sysinfo`; do not implement this by invoking and parsing `lsof`, `ss`, `netstat`, PowerShell, or shell scripts.

## Dependency changes

From `src-tauri/`:

```bash
cargo add netstat2@0.11
cargo add sysinfo@0.39
```

Do not add the Tauri shell plugin.

## Required Tauri commands

Implement narrow typed commands equivalent to:

```text
inspect_port
terminate_port_process
```

Do not create generic shell/process execution commands.

## Required behavior

### Inspection

- validate port `1..=65535` in Rust;
- query IPv4 + IPv6;
- query TCP + UDP;
- TCP: default view only LISTEN sockets;
- UDP: show bound sockets on the requested local port;
- preserve every matching socket;
- group actions by concrete PID;
- process metadata may be absent;
- PID may be absent even when a socket is visible;
- return deterministic platform fallback commands.

### Termination

- explicit confirmation in UI;
- terminate one PID at a time;
- reject PID 0;
- reject PID 1;
- reject the current application PID;
- no automatic privilege elevation;
- graceful first where supported;
- no automatic escalation to force;
- show force action only after it is justified;
- on denial/failure, expose copyable manual commands.

## UX requirements

Use the existing workbench design language.

Do not create dashboard cards for individual fields. Prefer a compact technical inspector layout.

Results need to make dual-stack/multiple sockets visible rather than hiding them behind a single “process owns port” sentence.

Each copyable fallback command uses the existing copy-button/clipboard foundation.

## Testing sequence

Follow spec-locked TDD for the risky boundaries:

1. port validation;
2. socket filtering/grouping;
3. fallback command generation;
4. protected PID rules;
5. termination result behavior;
6. frontend state transitions;
7. integration inspection on an ephemeral listener when reliable.

Never write a test that kills an arbitrary existing developer-machine process.

## Definition of done

Before finishing:

- `bun` frontend tests/typecheck/lint used by the repository pass;
- `cargo test` passes;
- `cargo clippy` passes under the repository policy;
- no shell permission was added;
- search finds this tool for `kill 3000`, `port`, `pid`, `lsof`;
- manual smoke test can identify a known local dev server;
- manual termination can stop a process owned by the current user;
- denial/hidden-owner path renders commands instead of lying or elevating.

Do not proceed to QR Generator in this handoff.
