# Architecture / Dependency Addendum — Port Inspector + QR Generator

This document records the cross-cutting changes introduced by the two additional tools.

## 1. New tools

```text
src/tools/
├── drop-server/
├── env-scrubber/
├── port-inspector/
└── qr-generator/
```

Native side:

```text
src-tauri/src/tools/
├── drop_server/
└── port_inspector/
```

`qr-generator` intentionally has no corresponding Rust tool module.

---

## 2. JavaScript dependencies

Use Bun.

```bash
bun add qrcode
bun add -d @types/qrcode
```

If clipboard-manager was not already installed:

```bash
bun tauri add clipboard-manager
```

Do not add a shell plugin for Port Inspector.

---

## 3. Rust dependencies

From `src-tauri/`:

```bash
cargo add netstat2@0.11
cargo add sysinfo@0.39
```

Prefer semver-compatible Cargo requirements in `Cargo.toml`:

```toml
netstat2 = "0.11"
sysinfo = "0.39"
```

---

## 4. Tauri commands

Add only:

```text
inspect_port
terminate_port_process
```

Do not create generic commands such as:

```text
run_shell_command
kill_pid_unchecked
execute_command
sudo
```

Generic shell/process execution would widen the trust boundary far beyond these tools.

---

## 5. Capability changes

The QR Generator needs image clipboard writes.

Existing clipboard permissions should become, at most:

```json
[
  "clipboard-manager:allow-write-text",
  "clipboard-manager:allow-write-image"
]
```

Do not enable:

```text
clipboard-manager:allow-read-text
clipboard-manager:allow-read-image
shell:allow-execute
shell:allow-spawn
shell:allow-kill
```

The Port Inspector uses custom Rust commands, not Tauri shell permissions.

---

## 6. Foundation boundaries

### Existing `foundation/clipboard`

Extend it with a narrow image-write adapter:

```ts
export interface ClipboardService {
  writeText(value: string): Promise<void>;
  writeImage(bytes: Uint8Array): Promise<void>;
}
```

If the existing abstraction was intentionally text-only, prefer a sibling `ImageClipboardService` rather than weakening a stable interface merely to force symmetry.

### No new `foundation/process`

Do not promote Port Inspector process operations into `foundation` yet.

Reason: there is currently only one process-inspection consumer. Keep the implementation inside the vertical slice until another real tool requires the same behavior.

### No new QR foundation

QR generation remains tool-local.

---

## 7. Search registry

Add both manifests to the existing tool registry. Their aliases/examples should participate in the same fuzzy/token search mechanism as the first tools.

Expected queries:

```text
"kill 3000"            -> Port Inspector
"who uses port 5432"   -> Port Inspector
"lsof"                 -> Port Inspector
"make qr"              -> QR Generator
"qr url"               -> QR Generator
"turn link into qr"    -> QR Generator
```

No embedding model is needed.

---

## 8. Defensive-programming emphasis

### Port Inspector

High-risk boundary:

- validate port;
- trust OS socket table, not heuristics;
- never guess PID;
- protect current PID and system sentinel PIDs;
- explicit mutation confirmation;
- no privilege escalation;
- no automatic force escalation.

### QR Generator

Lower-risk boundary:

- bound input bytes;
- validate options;
- normalize third-party errors;
- prevent stale async output;
- maintain exact clipboard semantics.

Do not apply native-system complexity to QR Generator merely because Port Inspector needed it.

---

## 9. Suggested implementation sequence

```text
06 Port Inspector
  ├─ contracts
  ├─ socket inspection
  ├─ process metadata
  ├─ fallback command generator
  ├─ termination boundary
  ├─ tests
  └─ UI

07 QR Generator
  ├─ qrcode adapter
  ├─ option validation
  ├─ preview state
  ├─ clipboard image adapter
  ├─ tests
  └─ UI polish
```

After both are complete, run the existing hardening/final-review practices again for the touched areas rather than rerunning a wholesale architectural rewrite.
