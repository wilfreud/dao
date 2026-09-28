---
name: tauri-boundaries
description: Keep a narrow, typed and secure boundary between the React WebView and privileged Rust capabilities.
---

# Tauri boundaries

## Placement rule

Prefer TypeScript for:

- pure text transformations
- launcher search/ranking
- UI state
- formatting

Prefer Rust/Tauri for:

- opening/listening network sockets
- writing uploaded files
- enumerating machine network interfaces
- lifecycle-sensitive background resources
- privileged OS capabilities

## Command rules

- Command names are stable API surface.
- Request/response DTOs are serializable and camelCase at the JS boundary.
- Return typed command errors; do not expose arbitrary Rust debug strings as the API contract.
- Keep commands thin: validate/translate boundary data, call application logic, return DTO.
- Do not stream per-chunk upload progress through Tauri commands/events in V0.
- Use low-frequency events only for meaningful lifecycle/upload changes.
- Clean up JS event listeners on component unmount.

## Permission rules

- Use capabilities scoped to the `main` window.
- Do not enable remote API access.
- Clipboard gets write-text only in V0.
- Dialog gets open only in V0.
- Do not install/expose the Tauri filesystem plugin in V0; Rust owns upload filesystem writes.
