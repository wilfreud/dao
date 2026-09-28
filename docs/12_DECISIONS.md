# Architectural decisions

## ADR-001 — Modular monolith / vertical slices

**Decision:** static modular monolith with independent tool slices.

**Not chosen:** microservices, dynamic plugin runtime, full clean-architecture layer stack.

**Reason:** personal desktop toolbox benefits from local cohesion and cheap feature addition more than runtime extensibility.

## ADR-002 — DDD-light

**Decision:** use domain boundaries, invariants and explicit contracts without repository/entity/aggregate ceremony.

**Reason:** the tools are small; architecture must not cost more than the behavior.

## ADR-003 — Rust only at privileged/system boundary

**Decision:** Drop Server/native capabilities in Rust; Env Scrubber and launcher search in TypeScript.

**Reason:** reduces command surface and keeps pure logic cheap to test.

## ADR-004 — Static registry, no plugin API

**Decision:** tools export manifests imported at build time.

**Reason:** provides discoverability/search while avoiding dynamic code-loading/version/security complexity.

## ADR-005 — Intent-aware fuzzy search before embeddings

**Decision:** Fuse.js over curated aliases/intents/examples.

**Reason:** tool catalog is tiny; semantic metadata provides useful natural-language discovery without model/runtime/storage complexity.

Revisit only when lexical intent metadata demonstrably fails as tool count grows.

## ADR-006 — Bind selected IPv4 interface

**Decision:** Drop Server binds a user-selected eligible IPv4 address, not every interface.

**Reason:** smaller accidental network exposure and the copied address exactly identifies the listener.

## ADR-007 — Kernel-selected auto port

**Decision:** auto port means binding port `0`, then reading actual port.

**Reason:** eliminates random-port check/bind race.

## ADR-008 — No overwrite upload policy

**Decision:** collision-safe filenames; existing files never overwritten.

**Reason:** safer default for a convenience transfer utility.

## ADR-009 — No Drop Server auth in V0

**Decision:** manual, temporary unauthenticated LAN listener with explicit warning and strict file/request safety.

**Reason:** user requested a simple local drop server; auth is a distinct product feature. Binding only one interface limits exposure but does not create trust.

## ADR-010 — No dotenv dependency

**Decision:** bounded source scanner in TS.

**Reason:** the upstream loader parser intentionally returns semantic key/value data and normalizes representation, whereas this tool's product requirement is representation-preserving redaction.

## ADR-011 — No generic WebView filesystem permission

**Decision:** destination chosen through dialog; upload filesystem operations remain in Rust.

**Reason:** narrower capability surface.

## ADR-012 — Minimal persistence

**Decision:** no database and no settings store in V0.

**Reason:** none of the initial requirements require persistence. Add it only for a concrete preference/history feature later.
