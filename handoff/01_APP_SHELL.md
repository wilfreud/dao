# Handoff 01 — Launcher, routing and intent search

Implement only the app shell/launcher. Do not implement tool behavior yet.

## Read first

- `AGENTS.md`
- `.agents/skills/spec-locked-tdd/SKILL.md`
- `.agents/skills/tool-authoring/SKILL.md`
- `.agents/skills/ui-workbench/SKILL.md`
- `docs/04_CONTRACTS.md`
- `docs/05_APP_SHELL_AND_SEARCH.md`
- `docs/10_DESIGN_SYSTEM.md`

## Objective

Build `/` as the searchable tool launcher, add routes/placeholders for both V0 tools, and lock search behavior with tests.

## Required implementation

1. Hash-based React Router.
2. Static registry containing `drop-server` and `env-scrubber` manifests.
3. Registry invariant checks for duplicate IDs/routes.
4. Fuse.js search engine inside `src/app/search` using the weighted intent metadata strategy.
5. Search tests before/alongside implementation:
   - empty query -> all tools;
   - natural-language file-transfer query -> Drop Server first;
   - natural-language dotenv-secret query -> Env Scrubber first;
   - typo-tolerant useful result.
6. Launcher state provider retaining query + scroll position during navigation to a tool and back.
7. Launcher UI:
   - prominent autofocus search;
   - tool tile grid;
   - Escape clears query;
   - useful no-results state.
8. Placeholder tool pages using a reusable minimal `ToolPageHeader` with safe back behavior.
9. No permanent sidebar.

## Search metadata requirement

Use meaningful aliases/intents/examples, not keyword spam. The launcher should find:

- "receive a file from my iphone"
- "local upload server"
- "remove passwords from env"
- "share dotenv without values"

## Visual constraint

Do not make the launcher look like a SaaS dashboard. No KPI cards, gradients, huge rounded containers, or nested cards.

## Verification

Run TypeScript tests/typecheck/build plus existing Rust checks. Manually verify keyboard navigation and back restoration.

## Completion report

Include search test cases and screenshots are optional; report exact checks run.
