# LAN Drop Server — full specification

## Job

Temporarily expose a minimal upload page on one selected local IPv4 interface so another reachable device can send files to a chosen local directory.

## UI

Required controls/state:

- detected IPv4 interface selector;
- fixed/auto port selector;
- fixed port input default `8090`;
- destination directory picker;
- start/stop button;
- lifecycle indicator;
- when running: copyable URL `http://<ipv4>:<port>/`;
- recent upload list;
- concise security notice: anyone who can reach this address while the server is running can attempt an upload.

The page must never claim the server is running until Rust returns a running snapshot.

## Interface selection

Rust command enumerates local interfaces using `local-ip-address` and returns eligible IPv4 candidates.

Exclude:

- `127.0.0.0/8`;
- `0.0.0.0`;
- multicast;
- `169.254.0.0/16` link-local;
- IPv6.

Private RFC1918 addresses should be preferred for `isRecommended`.

Recommendation may additionally de-prioritize obvious tunnel/virtual names, but **must not hide them**. The user can choose any eligible candidate.

At server start, Rust re-enumerates/verifies that `bindAddress` is still assigned locally.

## Binding

Bind **only the selected IPv4 address**, not `0.0.0.0`, in V0. This reduces accidental exposure to VPN/other interfaces.

### Fixed mode

Attempt exactly:

```text
<selected-ip>:<requested-port>
```

If unavailable, return `PORT_IN_USE`/`SERVER_BIND_FAILED`. Never silently switch ports.

### Auto mode

Bind:

```text
<selected-ip>:0
```

Then read `listener.local_addr().port()`.

This is atomic allocation by the OS and avoids check-then-bind races.

## HTTP routes

Only:

```text
GET  /          minimal upload HTML page
POST /upload    multipart receiver
GET  /healthz   200 text/plain "ok"
*               404
```

No directory listing. No file download route. No API that exposes local filesystem paths.

## Upload page

Serve small self-contained HTML from Rust. No React bundle and no JavaScript dependency is required.

Essential form:

```html
<form method="post" action="/upload" enctype="multipart/form-data">
  <input type="file" name="files" multiple required>
  <button type="submit">Upload</button>
</form>
```

Add restrained responsive CSS and a human-readable success/error response page. Compatibility beats visual sophistication.

## Request limits

Central constants in one Rust module:

```text
MAX_UPLOAD_REQUEST_BYTES = 2 GiB
MAX_FILES_PER_REQUEST    = 32
MAX_FILENAME_BYTES       = 240
RECENT_UPLOAD_CAPACITY   = 50
STOP_TIMEOUT             = 2 seconds
COLLISION_ATTEMPTS_MAX   = 10_000
```

`MAX_UPLOAD_REQUEST_BYTES` covers the entire multipart request, not each file.

Axum multipart has its own small default body limit, so explicitly disable/replace that default for `/upload` and apply `tower_http::limit::RequestBodyLimitLayer` with our bound.

Do not add a CORS layer.

## Streaming

Never buffer an entire upload in memory.

For each file field:

1. read/sanitize filename metadata;
2. create a same-destination temporary file;
3. repeatedly read multipart field chunks;
4. async-write chunks to disk;
5. track total bytes with checked arithmetic;
6. flush/close;
7. atomically/no-clobber persist to final collision-safe filename;
8. emit completion event and add recent record.

Axum's multipart field supports chunked reads; use that path rather than `bytes()` for whole-file loading.

## Temporary file and cancellation policy

Use `tempfile` in the destination directory so partial data has RAII cleanup semantics.

The implementation should retain a `TempPath`/equivalent cleanup owner until final persistence. Convert the underlying file into a Tokio file for async writes if needed.

If request handling fails or is cancelled before persistence, the temporary artifact must not appear as a successful final file.

Use the current `tempfile` no-clobber persistence API where possible; if the exact API differs, preserve the invariant with an atomic create/rename strategy and tests.

## Filename policy

Never trust multipart `filename` as a path.

Pipeline:

1. obtain filename string;
2. reduce to basename semantics (no parent components);
3. sanitize unsafe platform characters with `sanitize-filename`;
4. trim/reject empty or dot-like results;
5. cap encoded filename length to `MAX_FILENAME_BYTES` without corrupting UTF-8;
6. choose a no-overwrite final candidate.

Collision examples:

```text
photo.jpg
photo (1).jpg
photo (2).jpg
```

Preserve final extension when producing suffixes.

Never overwrite an existing destination file in V0.

Collision resolution is bounded by `COLLISION_ATTEMPTS_MAX`; exceeding it is an upload failure.

## Multipart policy

Accept repeated file parts named `files`.

- more than 32 files => reject request;
- part without a usable filename => reject or skip only if explicitly tested/documented; default V0 choice is reject as bad request;
- unexpected non-file fields => reject as bad request rather than ignoring arbitrary form data;
- malformed multipart => 400;
- request too large => 413;
- filesystem failure => 500 response without leaking sensitive internal details.

A partially successful multi-file request may leave already completed files in place. V0 is not transactional across the whole request. The response must make partial success explicit rather than claiming all-or-nothing behavior.

## Server state

Recommended manager shape (exact names may vary):

```rust
pub struct DropServerManager {
    inner: Arc<tokio::sync::Mutex<DropServerState>>,
}

struct DropServerState {
    lifecycle: DropServerLifecycle,
    runtime: Option<ServerRuntime>,
    recent: VecDeque<UploadRecord>,
    next_upload_id: u64,
}

struct ServerRuntime {
    bind_address: Ipv4Addr,
    port: u16,
    destination: PathBuf,
    started_at_epoch_ms: u64,
    cancellation: CancellationToken,
    task: JoinHandle<ServerExit>,
}
```

Do not expose `JoinHandle` or cancellation primitives through the Tauri DTO.

## Start algorithm

1. Validate request DTO and fixed port range.
2. Under manager lock require `Stopped`; transition to `Starting`; release lock.
3. Validate selected address still belongs to eligible local interfaces.
4. Validate destination exists/is directory and probe writability using a safe temporary-file operation.
5. Bind `TcpListener` directly to requested/auto socket.
6. Obtain actual port.
7. Build Axum router and cancellation token.
8. Spawn server task with graceful shutdown.
9. Reacquire manager lock; store runtime; transition `Running`.
10. Return snapshot.
11. On any pre-running failure, reconcile lifecycle back to `Stopped` before returning typed error.

## Stop algorithm

1. Under lock require `Running`; transition `Stopping`; take runtime handle; release lock.
2. Cancel token.
3. Await server task with `STOP_TIMEOUT`.
4. If timeout, abort task explicitly.
5. Reacquire lock; clear active runtime; transition `Stopped`.
6. Return stopped snapshot.

Repeated stop while stopped => `SERVER_NOT_RUNNING` rather than pretending success.

Calls during `Starting`/`Stopping` => `SERVER_TRANSITION_IN_PROGRESS`.

## App exit

The operating system will close sockets at process termination, but design graceful cancellation anyway.

On Tauri exit request, signal the active cancellation token if practical without blocking the main event loop. Temporary upload ownership must ensure a cancelled handler does not publish a partial final file.

Do not delay app shutdown indefinitely waiting for network peers.

## Events/history

No byte-progress events in V0.

Emit only upload start/completion/failure and unexpected server termination.

Recent history lives in memory only, capped to 50 entries. No database/log collection is required.

## macOS/firewall note

The first inbound listener may trigger an OS/firewall permission path. The application should surface bind errors cleanly; do not attempt to alter the user's firewall automatically.

## Acceptance examples

- Fixed 8090 available -> starts on 8090.
- Fixed 8090 occupied -> explicit error, UI remains stopped.
- Auto -> returns a real OS-selected port > 0.
- Selecting Wi-Fi IPv4 -> copied URL contains that exact address.
- Traversal filename `../../x.txt` -> cannot escape destination.
- Existing `x.txt` -> upload creates a new collision-safe filename, never overwrites.
- >2 GiB request -> rejected/bounded.
- Cancelling/stopping mid-upload -> no completed-looking partial target.
- No GET route can download received files.
