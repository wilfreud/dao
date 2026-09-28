# Security model

This is a personal desktop application, but it deliberately opens a LAN HTTP listener and handles untrusted multipart input. Treat that boundary seriously.

## Tauri capability policy

Use a capability scoped to the main window only.

Conceptual `src-tauri/capabilities/main.json`:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "main-capability",
  "description": "Minimal permissions for the main local workbench window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "dialog:allow-open",
    "clipboard-manager:allow-write-text"
  ]
}
```

After `bun run tauri add ...`, inspect generated permissions/capabilities and reduce them to this intent. Plugin installers may add default permissions automatically.

Never enable clipboard read for V0. Users can paste normally into a textarea; the app does not need programmatic clipboard access.

Never enable dialog save/message/etc. merely because the plugin supports them if V0 only requires folder selection.

Do not enable remote Tauri API origins. Bundled local code only.

## No generic filesystem API in WebView

Do not install/expose the Tauri FS plugin in V0.

Destination selection produces a user-chosen path through the dialog plugin. That path is sent to our Rust command, and all file writes occur in Rust under the narrow drop-server behavior.

This is easier to reason about than giving JavaScript a generic write API.

## LAN threat boundary

The drop server has **no authentication** in V0.

While running, any peer with network reachability to the bound address/port can attempt uploads.

Mitigations:

- bind one selected IPv4 interface, not all interfaces;
- server is off by default and manually started;
- no download/list route;
- bounded request bytes;
- bounded file count;
- no path traversal;
- no overwrite;
- temporary-file persistence;
- concise UI warning;
- stopping server closes the listener;
- do not automatically punch firewall rules.

If the tool later becomes useful on untrusted networks, authentication/tokenized URLs become a new feature/spec rather than a hidden V0 addition.

## HTTP response hygiene

- Do not reflect arbitrary filenames into HTML without HTML escaping.
- Keep responses simple and generated from trusted templates + escaped values.
- Do not expose local destination paths to the remote browser.
- Add `X-Content-Type-Options: nosniff` and a restrictive page CSP for the tiny upload page if straightforward.
- No external fonts/scripts/assets in the upload page.

## File safety

- multipart `filename` is data, never a path;
- sanitize + basename + UTF-8-safe max length;
- no-overwrite final persistence;
- same-directory temporary file;
- cleanup partial files on handler failure/cancellation;
- do not execute/open received files automatically.

## Dependency policy

- commit `bun.lock` and `Cargo.lock`;
- avoid prereleases;
- run `cargo audit`/dependency scanning optionally in CI or manually, but do not add a large security platform just for V0;
- dependency additions require a concrete responsibility documented in the PR/commit.
