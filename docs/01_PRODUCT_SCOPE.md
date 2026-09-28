# Product scope — V0.1

## Product sentence

A local-first desktop developer workbench: a searchable home screen that launches small, focused personal development utilities.

The final name is undecided. Keep product naming out of domain/module identifiers wherever possible.

## User model

Single local user. No accounts, cloud backend, telemetry, multi-user tenancy, remote sync or collaboration in V0.

## Core UX

`/` is the launcher:

- one prominent search field;
- a grid of tool tiles;
- search understands names, aliases and common intent phrases;
- clicking a tile navigates to `/tools/<tool-id>`;
- tool pages offer back navigation;
- returning to `/` restores the current launcher query/scroll state during the app session.

## V0 tools

### LAN Drop Server

Start a temporary HTTP upload endpoint on one selected local IPv4 interface, choose fixed port 8090 or automatic free port, copy the resulting URL, and receive files into a chosen local directory.

### Env Scrubber

Paste dotenv-style text and produce a redacted version where assignment values are removed while meaningful source formatting/comments remain useful.

## Explicit non-goals

- generic dynamic plugin runtime
- plugin marketplace
- account/auth system
- background daemon outside the app lifetime
- internet-facing file sharing
- TLS certificate management
- upload authentication in V0
- download/file-browser endpoint in the drop server
- AI/embedding model for launcher search in V0
- persistent database
- CQRS/event bus/repository abstractions
- comprehensive dotenv execution semantics
- replacing a shell/IDE

## Future-proofing rule

Future capability is enabled by stable boundaries and static manifests, not by implementing hypothetical infrastructure today.
