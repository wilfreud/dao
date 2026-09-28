# Env Scrubber — full specification

## Job

Turn dotenv-style source text into a safe-to-share skeleton by removing assignment values while retaining useful comments, ordering, key spelling and surrounding source style.

This is a **redactor**, not an environment loader.

## Placement

Pure TypeScript. No Rust command. No `dotenv` runtime dependency.

## Why not call `dotenv.parse()`

The official dotenv implementation converts source to a key/value object and normalizes line endings before parsing. That loses comments, source order and exact formatting. Those are part of this tool's desired output.

We implement a bounded source scanner inspired by the upstream syntax rules, without copying its implementation.

## Input limit

```text
MAX_ENV_INPUT_BYTES = 1 MiB (UTF-8 encoded)
```

The UI checks encoded size before transformation. Larger input gets an explicit error; do not freeze the UI scanning arbitrary multi-megabyte text.

## Supported assignment syntax

V0 recognizes the relevant current dotenv forms:

```dotenv
KEY=value
KEY = value
export KEY=value
KEY: value
```

Key characters:

```text
A-Z a-z 0-9 _ . -
```

Values may be:

- empty;
- unquoted;
- single-quoted;
- double-quoted;
- backtick-quoted;
- quoted values may span physical lines when a valid closing quote is found;
- `#` outside a quoted value starts an inline comment;
- `#` inside a quoted value is data.

No variable expansion/interpolation is performed.

## Transformation contract

Preserve unchanged wherever possible:

- comments;
- blank lines;
- assignment order;
- key spelling;
- optional `export` prefix;
- whitespace before key;
- whitespace around separator;
- separator style (`=` or `: `);
- quote style;
- inline comment and its spacing;
- invalid/unrecognized lines (with diagnostics);
- BOM if present;
- line ending representation outside any removed multiline value.

Replace only value content.

Examples:

```dotenv
# Database
DATABASE_URL=postgres://user:pass@host/db
PORT = 5432
EMPTY=
TOKEN="abc#123" # private token
export API_KEY='secret'
YAML_STYLE: hello
```

becomes:

```dotenv
# Database
DATABASE_URL=
PORT = 
EMPTY=
TOKEN="" # private token
export API_KEY=''
YAML_STYLE: 
```

Quoted values keep their delimiter pair.

### Multiline quoted value

Input:

```dotenv
CERT="line one
line two"
NEXT=value
```

Output:

```dotenv
CERT=""
NEXT=
```

The secret value's internal physical lines are removed. This means global line count is **not** a preservation guarantee for multiline quoted values.

Comments appearing inside quotes are part of the value and disappear with it.

## Diagnostics

Never imply that an unrecognized line was safely redacted.

```ts
export type ScrubDiagnosticKind =
  | "unrecognized-line"
  | "unterminated-quote";

export interface ScrubDiagnostic {
  readonly line: number; // 1-based start line
  readonly kind: ScrubDiagnosticKind;
  readonly message: string;
}

export interface ScrubResult {
  readonly output: string;
  readonly redactedAssignments: number;
  readonly diagnostics: readonly ScrubDiagnostic[];
}
```

Rules:

- comment/blank lines produce no diagnostic;
- recognized assignments increment `redactedAssignments` even if value was already empty;
- a non-empty non-comment line that cannot be confidently parsed remains unchanged and produces `unrecognized-line`;
- a line that starts a quote-looking assignment but has no valid close before end-of-input must not be silently treated as safely scrubbed; return `unterminated-quote` and leave that assignment source unchanged.

This conservative policy avoids leaking secrets behind a false green state.

## Scanner implementation strategy

Do not split and rebuild the entire document using normalized `\n`.

Scan the original JavaScript string by character offsets and build output from original slices plus replacement fragments.

High-level grammar:

1. preserve BOM/leading source position;
2. at each logical statement start, identify indentation;
3. skip pure whitespace/blank line;
4. `#` => comment line;
5. optionally detect exact `export` followed by whitespace;
6. read key chars;
7. detect separator:
   - `=` allowing surrounding whitespace;
   - `:` only when followed by whitespace;
8. identify value start after separator spacing;
9. if first non-space char is `'`, `"`, or backtick, find valid closing quote with escape handling;
10. otherwise value ends at unquoted `#` or physical line ending;
11. preserve suffix/comment/line ending;
12. replace value content only.

Do not duplicate the upstream dotenv source code. Implement the small grammar from the contract and tests.

## Escape behavior

For quoted scanning, an immediately preceding backslash escapes a matching quote for V0. Tests must cover escaped quotes and an eventual real closing quote.

The scrubber does not need to unescape or evaluate the value; it only needs to find the safe source boundary.

## UI

Resizable horizontal split on normal desktop sizes:

```text
INPUT  | draggable handle | OUTPUT
```

Required controls:

- Paste button is optional because normal OS paste already works; do not require clipboard-read permission.
- Clear.
- Copy output (clipboard write only).
- assignment count.
- diagnostics indicator/list when present.

Do not show a "safe"/success state if diagnostics exist. Use wording such as `2 lines need review`.

## Test matrix

At minimum:

- comment-only file;
- blank lines;
- LF and CRLF preservation;
- empty values;
- unquoted value;
- whitespace around `=`;
- `export` prefix;
- colon separator with required whitespace;
- single/double/backtick quotes;
- `#` inside each quoted value;
- inline comment after value;
- escaped quote;
- multiline quoted value;
- duplicate keys;
- key with `.`, `-`, `_`, digits;
- invalid statement left unchanged + diagnostic;
- unterminated quoted assignment + diagnostic;
- input at/over size boundary;
- BOM preservation.
