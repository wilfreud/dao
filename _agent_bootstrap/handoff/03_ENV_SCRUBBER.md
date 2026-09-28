# Handoff 03 — Implement Env Scrubber

## Read first

- `AGENTS.md`
- `.agents/skills/defensive-programming/SKILL.md`
- `.agents/skills/spec-locked-tdd/SKILL.md`
- `.agents/skills/tool-authoring/SKILL.md`
- `.agents/skills/ui-workbench/SKILL.md`
- `docs/07_ENV_SCRUBBER_SPEC.md`
- `docs/09_TEST_STRATEGY.md`
- `docs/10_DESIGN_SYSTEM.md`

## Objective

Implement a bounded, format-aware dotenv redactor in pure TypeScript and its resizable workbench UI.

## Contract lock

Before implementation, create table-driven tests for the entire test matrix in `docs/07_ENV_SCRUBBER_SPEC.md`.

Do not install `dotenv` and do not copy its source parser.

Implement a small scanner against the written grammar.

## Required behavior

- comments/order/key spelling preserved;
- optional `export` recognized;
- `=` and supported colon form recognized;
- unquoted, single, double, backtick and multiline quoted values scrubbed;
- inline comments preserved;
- quote style preserved;
- invalid/unsafe-to-interpret lines left unchanged with diagnostics;
- unterminated quote diagnosed rather than falsely redacted;
- 1 MiB UTF-8 input bound;
- no programmatic clipboard read permission.

## UI

- resizable input/output panels on normal desktop width;
- vertical fallback for narrow window;
- Clear;
- Copy output through existing `foundation/clipboard`;
- redacted assignment count;
- diagnostics list/count;
- no "safe" success indicator while diagnostics exist.

## Verification

Run unit tests/typecheck/build and all existing regression checks.

## Completion report

List parser/scanner edge cases covered and exact checks run.
