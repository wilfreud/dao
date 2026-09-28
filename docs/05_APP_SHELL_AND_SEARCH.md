# App shell, launcher and search

## Router

Use React Router with a hash-based router for the desktop SPA.

Routes:

```text
/                       launcher
/tools/drop-server      drop server
/tools/env-scrubber     env scrubber
*                       small Not Found -> link/back to launcher
```

Hash routing is an implementation choice for a self-contained WebView app; do not build server-style URL rewriting infrastructure.

## Back navigation

Launcher tiles navigate with route state indicating they came from the launcher.

Tool header behavior:

- if current location indicates launcher-origin history, `navigate(-1)`;
- otherwise navigate to `/`;
- keyboard/browser back should also work naturally.

Keep a small `LauncherStateProvider` above routed pages so the current search query and stored launcher scroll position survive navigating into a tool and back during the app session.

Do not persist launcher state to disk in V0.

## Static tool registry

Example:

```ts
export const toolRegistry = Object.freeze([
  dropServerManifest,
  envScrubberManifest,
] satisfies readonly ToolManifest[]);
```

On module initialization/development, assert unique IDs and routes. A duplicate is a programmer error and should fail loudly.

## Search: what "semantic" means in V0

V0 does **not** ship embeddings or an LLM.

It implements **intent-aware lexical/fuzzy search** over curated metadata. For a small personal tool catalog this gives most of the desired experience with near-zero operational complexity.

Fields:

- name
- description
- aliases
- intents
- example natural-language queries

Example drop-server metadata:

```ts
search: {
  aliases: ["file drop", "lan upload", "local upload", "airdrop alternative"],
  intents: [
    "receive a file from another device",
    "send a file to this computer over wifi",
    "temporary local file upload server"
  ],
  examples: [
    "receive a file from my iphone",
    "open a local upload page",
    "transfer a file over lan"
  ]
}
```

Example env scrubber metadata:

```ts
search: {
  aliases: ["dotenv", "env redactor", "secret scrubber", "sanitize env"],
  intents: [
    "remove secrets from an env file",
    "share dotenv without values",
    "empty environment variable values"
  ],
  examples: [
    "remove passwords from .env",
    "make an env example file",
    "strip secret values"
  ]
}
```

## Fuse.js configuration

Use Fuse.js token search. Keep configuration in one file and test ranking behavior.

Recommended starting point, tune only against tests/user experience:

```ts
const options = {
  includeScore: true,
  shouldSort: true,
  useTokenSearch: true,
  threshold: 0.35,
  ignoreLocation: true,
  keys: [
    { name: "name", weight: 4 },
    { name: "search.aliases", weight: 3 },
    { name: "description", weight: 2 },
    { name: "search.intents", weight: 2.5 },
    { name: "search.examples", weight: 2.5 },
  ],
} as const;
```

Fuse score is lower-is-better; expose a normalized larger-is-better `relevance` to UI consumers so library scoring details do not leak throughout the app.

Empty/whitespace query => every tool, no artificial score needed.

## Search engine boundary

Keep it inside `src/app/search`, not foundation:

```ts
export interface ToolSearchEngine {
  search(
    query: string,
    tools: readonly ToolManifest[]
  ): readonly ToolSearchHit[];
}
```

Do not create multiple implementations until needed. The interface exists because search strategy is an app-shell concern that may genuinely evolve to local embeddings later.

## Keyboard interaction

V0 baseline:

- launcher search receives focus on initial launcher load;
- `Escape` clears query when non-empty;
- tiles are normal focusable links/buttons;
- Enter activates focused tile;
- do not implement a global command palette yet.
