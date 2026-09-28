# Port Inspector — Product & Engineering Specification

## 1. Purpose

Port Inspector answers a recurring local-development question:

> What process owns this local port, and can I stop it safely?

The tool must inspect local TCP/UDP listeners without requiring a shell command in the normal path. If the operating system does not expose the owning PID or refuses termination, the UI must provide platform-native inspection and termination commands that the user can copy and run manually.

The application must **never request privilege elevation automatically**.

---

## 2. Scope — V1

### Included

- Accept a single port in the inclusive range `1..=65535`.
- Inspect both IPv4 and IPv6.
- Inspect TCP and UDP.
- TCP results default to listening sockets only.
- UDP results represent sockets bound to the requested local port.
- Resolve zero, one, or many owning PIDs.
- Resolve process metadata when available.
- Show process PID, name, executable path when available, protocol, local bind address, and TCP state.
- Refresh results manually.
- Terminate one selected owning process.
- If graceful termination is unsupported or the process remains alive, expose a distinct **Force kill** action.
- When PID ownership cannot be determined, show copyable inspection commands.
- When termination is denied, show copyable termination commands, including an elevated variant where the platform conventionally supports it.
- Never execute the displayed fallback commands from the WebView.

### Explicitly excluded from V1

- Remote-machine inspection.
- Port ranges.
- Continuous polling / live monitor mode.
- Automatic sudo/UAC elevation.
- Bulk “kill everything on this port” without selecting/confirming owners.
- Firewall management.
- Opening ports.
- Packet capture.
- Network traffic inspection.

---

## 3. Tool manifest

Recommended manifest metadata:

```ts
export const portInspectorManifest = {
  id: "port-inspector",
  name: "Port Inspector",
  description: "Find which local process owns a port and terminate it when possible.",
  route: "/tools/port-inspector",
  aliases: [
    "port",
    "pid",
    "process",
    "listener",
    "socket",
    "kill port",
    "free port",
    "lsof",
    "ss",
    "netstat"
  ],
  examples: [
    "who uses port 3000",
    "kill port 5000",
    "free localhost 8080",
    "find process listening on 5432"
  ],
  capabilities: ["network", "process-inspection", "process-termination"]
} as const;
```

---

## 4. UX

### Initial state

```text
Port Inspector

Port
[ 3000                         ] [ Inspect ]

Examples: 3000, 5000, 5432, 8080
```

Pressing Enter submits.

### Result state — one owner

```text
Port 3000                           [ Refresh ]

TCP · LISTEN · 127.0.0.1:3000

node
PID 81243
/opt/homebrew/bin/node

[ Kill process ]
```

### Result state — multiple owners / sockets

Do not collapse information destructively. Group by PID for actions, but preserve every socket row.

Example:

```text
PID 81243 · node
  TCP  0.0.0.0:3000     LISTEN
  TCP  [::]:3000        LISTEN

PID 81251 · helper
  UDP  0.0.0.0:3000
```

Each PID group has its own terminate action.

### Owner hidden

```text
TCP · LISTEN · 0.0.0.0:80
Owner PID is not visible to the current process.

Check manually
$ sudo lsof -nP -iTCP:80 -sTCP:LISTEN     [ Copy ]
```

Do not render a fake or guessed PID.

### Termination denied

```text
Could not terminate PID 123.
The process may belong to another user or require elevated privileges.

Try manually
$ kill -TERM 123                  [ Copy ]
$ sudo kill -TERM 123             [ Copy ]
```

The application does not execute these commands.

### Confirmation

Before terminating a process, require an explicit confirmation surface containing at minimum:

- process name if known;
- PID;
- port;
- protocol/socket count associated with this result.

Do not use a generic “Are you sure?” without context.

---

## 5. Native implementation

### Dependencies

Add to `src-tauri/Cargo.toml`:

```toml
netstat2 = "0.11"
sysinfo = "0.39"
```

Use existing `serde`, error-handling, and Tauri dependencies already present in the project.

**Toolchain note:** current `sysinfo 0.39.x` requires a recent Rust toolchain. Prefer updating stable Rust rather than downgrading architecture or shelling out solely to avoid a toolchain update.

### Why these crates

`netstat2` retrieves socket data via platform APIs and returns associated PIDs. It uses native mechanisms on Windows, Linux and macOS instead of parsing CLI output.

`sysinfo` resolves process metadata and provides process termination primitives.

### No Tauri shell plugin

Do **not** add `@tauri-apps/plugin-shell` for this tool.

Fallback commands are rendered as inert text and copied through the existing clipboard foundation. They are never executed by the application.

This is an intentional security boundary.

---

## 6. Rust module layout

Recommended shape:

```text
src-tauri/src/tools/port_inspector/
├── mod.rs
├── commands.rs
├── inspect.rs
├── process.rs
├── fallback_commands.rs
└── error.rs
```

Avoid premature submodules if the implementation remains small; the names above describe responsibilities, not a mandatory file-count target.

---

## 7. Contracts

### Frontend → Rust

```ts
type NetworkProtocol = "tcp" | "udp";
type AddressFamily = "ipv4" | "ipv6";

type ProcessSummary = {
  pid: number;
  name: string | null;
  executablePath: string | null;
  command: string[] | null;
};

type PortSocket = {
  protocol: NetworkProtocol;
  addressFamily: AddressFamily;
  localAddress: string;
  localPort: number;
  tcpState: string | null;
  associatedPids: number[];
};

type ProcessOwner = {
  process: ProcessSummary;
  sockets: PortSocket[];
};

type CommandSuggestion = {
  label: string;
  command: string;
  requiresElevation: boolean;
};

type InspectPortResult = {
  port: number;
  sockets: PortSocket[];
  owners: ProcessOwner[];
  unresolvedSocketCount: number;
  inspectionCommands: CommandSuggestion[];
};
```

Command:

```ts
invoke<InspectPortResult>("inspect_port", { port })
```

### Termination request

```ts
type TerminateProcessRequest = {
  pid: number;
  portContext: number;
  mode: "graceful" | "force";
};

type TerminateProcessResult = {
  pid: number;
  signalAttempted: "term" | "kill" | "platform-terminate";
  signalSent: boolean;
  stillRunning: boolean;
  terminationCommands: CommandSuggestion[];
};
```

Command:

```ts
invoke<TerminateProcessResult>("terminate_port_process", {
  request
})
```

`portContext` is informational/contextual. Termination targets a PID, not an abstract port.

---

## 8. Inspection algorithm

1. Validate `port` before touching OS APIs.
2. Execute blocking OS inspection work through `tauri::async_runtime::spawn_blocking` (or equivalent project abstraction).
3. Query:
   - address families: IPv4 + IPv6;
   - protocols: TCP + UDP.
4. Filter `local_port == requested_port`.
5. For TCP, keep `LISTEN` sockets for the default V1 view.
6. Keep bound UDP sockets on the requested local port.
7. Preserve each socket even when multiple sockets map to the same PID.
8. Deduplicate PIDs only for process metadata lookup/action grouping.
9. Resolve each visible PID through `sysinfo`.
10. Return unresolved socket count when `associated_pids` is empty.
11. Generate fallback inspection commands deterministically from `(platform, port)`.

Never infer process ownership from process names, command-line text, or port conventions.

---

## 9. Termination policy

### Hard safety invariants

The backend must reject termination when:

- PID is `0`;
- PID is `1`;
- PID equals the current application process PID;
- PID does not currently exist;
- input is malformed/out of range.

The frontend disabling a button is not sufficient. These checks live in Rust.

### Graceful mode

Unix-like platforms:

- attempt `SIGTERM` through `sysinfo` when supported;
- wait briefly / refresh process state;
- if still alive, return `stillRunning: true`;
- do **not** automatically escalate to `SIGKILL`.

Windows:

- use the platform-supported termination primitive exposed by `sysinfo`;
- report the action accurately; do not claim POSIX signal semantics.

### Force mode

Only expose after:

- graceful termination is unsupported; or
- a graceful attempt was sent but the process remains alive.

Force mode sends the strongest normal termination primitive available through `sysinfo`.

### Permission failure

Never attempt sudo/UAC automatically.

Return `terminationCommands` so the UI can display copyable alternatives.

---

## 10. Fallback command generation

Command generation is a pure function and must be unit tested.

### macOS

Inspect TCP:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

Elevated inspection when owner visibility is restricted:

```bash
sudo lsof -nP -iTCP:3000 -sTCP:LISTEN
```

Inspect UDP:

```bash
lsof -nP -iUDP:3000
```

Terminate:

```bash
kill -TERM 81243
sudo kill -TERM 81243
```

Force:

```bash
kill -KILL 81243
sudo kill -KILL 81243
```

### Linux

Inspect TCP:

```bash
ss -lptn 'sport = :3000'
```

Elevated:

```bash
sudo ss -lptn 'sport = :3000'
```

UDP:

```bash
ss -lpun 'sport = :3000'
```

Termination uses the same `kill` / `sudo kill` forms as macOS.

### Windows / PowerShell

Inspect:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen | Select-Object LocalAddress,LocalPort,OwningProcess,State
```

Resolve process:

```powershell
Get-Process -Id 81243
```

Terminate:

```powershell
Stop-Process -Id 81243
```

Force:

```powershell
Stop-Process -Id 81243 -Force
```

If permission is denied, the UI should say to run the command from an Administrator PowerShell. Do not generate an opaque self-elevation script.

---

## 11. Error model

Use a discriminated application error rather than stringly-typed errors.

Recommended categories:

```ts
type PortInspectorErrorCode =
  | "INVALID_PORT"
  | "SOCKET_TABLE_UNAVAILABLE"
  | "PROCESS_LOOKUP_FAILED"
  | "PROCESS_NOT_FOUND"
  | "PROTECTED_PROCESS"
  | "TERMINATION_DENIED"
  | "TERMINATION_FAILED"
  | "UNSUPPORTED_PLATFORM"
  | "INTERNAL_ERROR";
```

Error messages shown to the user should explain the next action without exposing Rust debug formatting.

---

## 12. UI state machine

Recommended frontend state:

```ts
type PortInspectorState =
  | { status: "idle" }
  | { status: "inspecting"; port: number }
  | { status: "ready"; result: InspectPortResult }
  | { status: "empty"; port: number }
  | { status: "terminating"; result: InspectPortResult; pid: number }
  | { status: "error"; port?: number; error: UiError };
```

Do not represent “loading + result + error” as unrelated booleans.

---

## 13. Testing

### Rust unit tests

- Reject port `0` and `> 65535` at the boundary.
- Filter sockets by requested local port.
- TCP default view includes LISTEN only.
- UDP bound sockets remain visible.
- Group two sockets owned by the same PID under one owner without dropping sockets.
- Preserve unresolved sockets when `associated_pids` is empty.
- Reject PID `0`, PID `1`, and self PID.
- Generate exact platform commands for representative ports/PIDs.
- Never include unvalidated arbitrary user text in shell-command strings.

### Rust integration test

Where reliable in CI:

1. bind a local ephemeral `TcpListener`;
2. ask the Port Inspector to inspect its assigned port;
3. assert that the socket is found;
4. assert that the current PID appears when the platform exposes ownership.

Do not fail the entire suite solely because a sandboxed CI runner hides PID ownership; separate socket discovery from ownership assertions.

### Termination integration test

Only terminate a process spawned specifically by the test suite.

Never write a test that kills a pre-existing port owner on the developer machine.

### Frontend tests

- validation/submit behavior;
- zero-owner/one-owner/multi-owner rendering;
- owner-hidden fallback command UI;
- confirmation contains PID + process name + port;
- force action hidden before it is justified;
- copy command invokes clipboard foundation with exact text.

---

## 14. Security checklist

- No shell plugin added.
- No automatic elevation.
- No raw shell command execution.
- No kill by process name.
- No kill by port without a concrete resolved PID.
- No automatic kill-all.
- Self PID protected in Rust.
- PID 0/1 protected in Rust.
- Confirmation before mutation.
- Port input numeric and bounded.
- Process command line is display-only; never interpolated into commands.
- Fallback command strings interpolate numeric validated port/PID only.

---

## 15. Acceptance criteria

The tool is complete when:

1. Entering a free port clearly returns “Nothing is listening on this port.”
2. Entering a port owned by a normal user process shows its socket and PID.
3. Dual-stack sockets are not incorrectly collapsed into one hidden socket.
4. A visible owner can be terminated after explicit confirmation.
5. The app never elevates itself.
6. When owner lookup or termination is blocked, the user receives correct copyable commands.
7. The app cannot terminate itself, PID 0, or PID 1 through its Tauri command.
8. No shell execution permission is introduced to support this feature.
