# Stable contracts

These names and shapes are V0 API contracts. Change them only intentionally and update both sides + tests + docs together.

## Tool registry contract (TypeScript)

```ts
import type { LucideIcon } from "lucide-react";

export type ToolCategory = "network" | "text" | "files" | "developer";

export interface ToolManifest {
  readonly id: string;
  readonly route: `/tools/${string}`;
  readonly name: string;
  readonly description: string;
  readonly category: ToolCategory;
  readonly icon: LucideIcon;
  readonly search: {
    readonly aliases: readonly string[];
    readonly intents: readonly string[];
    readonly examples: readonly string[];
  };
}

export interface ToolSearchHit {
  readonly tool: ToolManifest;
  /** normalized UI relevance where larger means better */
  readonly relevance: number;
}
```

Registry invariants:

- `id` unique and kebab-case;
- `route` unique;
- route must equal `/tools/${id}` unless a documented migration requires otherwise;
- every tool has at least one intent/example phrase;
- no manifest contains implementation callbacks.

## Network interface DTO

Rust command:

```text
network_list_ipv4_interfaces
```

TypeScript:

```ts
export interface NetworkInterfaceDto {
  readonly name: string;
  readonly address: string;       // canonical IPv4 string
  readonly isPrivate: boolean;    // RFC1918
  readonly isRecommended: boolean;
}
```

Rust must exclude:

- IPv6;
- loopback;
- unspecified;
- multicast;
- link-local `169.254.0.0/16`.

Do not silently remove valid private candidates merely because the interface looks virtual. Recommendation is a heuristic; the UI still shows candidates.

## Port selection

```ts
export type PortSelection =
  | { readonly mode: "fixed"; readonly port: number }
  | { readonly mode: "auto" };
```

Rust equivalent should be a serde-tagged enum:

```rust
#[derive(Debug, Deserialize)]
#[serde(tag = "mode", rename_all = "camelCase")]
pub enum PortSelection {
    Fixed { port: u16 },
    Auto,
}
```

Fixed valid range: **1024..=65535** for the UI contract. V0 intentionally avoids privileged ports.

Default fixed port: **8090**.

Auto mode does **not** generate/check random integers. It binds the selected IPv4 address with port `0` and reads the kernel-assigned port from the listener.

## Drop-server start contract

Command:

```text
drop_server_start
```

Request:

```ts
export interface DropServerStartRequest {
  readonly destinationPath: string;
  readonly bindAddress: string;
  readonly port: PortSelection;
}
```

The `bindAddress` must be one of the currently enumerated eligible local IPv4 addresses at start time. Rust re-validates it; the UI is not a trust boundary.

## Lifecycle

```ts
export type DropServerLifecycle =
  | "stopped"
  | "starting"
  | "running"
  | "stopping";
```

Stable transitions:

```text
STOPPED -> STARTING -> RUNNING -> STOPPING -> STOPPED
                 \-> STOPPED   (start failure)
```

No stable `failed` lifecycle. Failures are returned/emitted and resource state reconciles to `stopped`.

## Upload record

```ts
export type UploadOutcome = "completed" | "failed";

export interface UploadRecord {
  readonly uploadId: number;
  readonly fileName: string;
  readonly sizeBytes: number;
  readonly receivedAtEpochMs: number;
  readonly outcome: UploadOutcome;
  readonly errorCode?: string;
}
```

`uploadId` is a per-process monotonic sequence, not a persistent identity. Reset on application restart is allowed.

## Drop-server snapshot

Commands:

```text
drop_server_status
drop_server_stop
```

Response:

```ts
export interface DropServerSnapshot {
  readonly lifecycle: DropServerLifecycle;
  readonly bindAddress: string | null;
  readonly port: number | null;
  readonly destinationPath: string | null;
  readonly startedAtEpochMs: number | null;
  readonly recentUploads: readonly UploadRecord[];
}
```

Snapshot invariants:

- `running` => bindAddress, port, destinationPath and startedAtEpochMs are non-null;
- `stopped` => all active-server fields are null;
- recent uploads are capped at 50 newest records.

## Low-frequency events

V0 event names:

```text
drop-server://upload-started
drop-server://upload-completed
drop-server://upload-failed
drop-server://stopped-unexpectedly
```

No per-chunk progress event in V0.

Example event payload:

```ts
export interface UploadEventPayload {
  readonly uploadId: number;
  readonly fileName: string;
  readonly sizeBytes?: number;
  readonly receivedAtEpochMs: number;
  readonly errorCode?: string;
}
```

React listeners must be cleaned up on unmount.

## Command error DTO

All recoverable command failures cross the Tauri boundary as:

```ts
export interface AppCommandError {
  readonly code: CommandErrorCode;
  readonly message: string;
  readonly details?: Readonly<Record<string, string | number | boolean | null>>;
}

export type CommandErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_PORT"
  | "INVALID_BIND_ADDRESS"
  | "NETWORK_ENUMERATION_FAILED"
  | "DESTINATION_NOT_FOUND"
  | "DESTINATION_NOT_DIRECTORY"
  | "DESTINATION_NOT_WRITABLE"
  | "SERVER_ALREADY_RUNNING"
  | "SERVER_NOT_RUNNING"
  | "SERVER_TRANSITION_IN_PROGRESS"
  | "PORT_IN_USE"
  | "SERVER_BIND_FAILED"
  | "SERVER_INTERNAL";
```

Do not make frontend behavior depend on matching error-message strings.

## Rust error layering

Use an internal `thiserror` enum with sources, then map intentionally into `AppCommandError` at the command boundary. Logs may contain technical causes; the command contract should stay stable.
