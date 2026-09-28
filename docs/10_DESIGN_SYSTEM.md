# Design system / visual direction

## Identity

Developer workbench, not SaaS admin dashboard.

The app should feel closer to a native utility/editor than a marketing product.

## Principles

- whitespace is structural, not decorative;
- strong typography hierarchy, restrained chrome;
- minimal card nesting;
- thin/subtle separators where needed;
- small radius, not pill-everything;
- no gradients unless a later brand deliberately introduces one;
- no oversized dashboard KPI components;
- icons support scanning but do not replace labels;
- machine values use monospace.

## Launcher

Desktop sketch:

```text
┌────────────────────────────────────────────────────────────┐
│                                                            │
│            Search tools or describe a task…                │
│     ┌──────────────────────────────────────────────────┐   │
│     │ receive a file from my iphone                    │   │
│     └──────────────────────────────────────────────────┘   │
│                                                            │
│     Drop Server                    Env Scrubber             │
│     Receive files over LAN         Strip dotenv values     │
│     [network]                      [text]                    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

Tiles should be clickable surfaces but not glossy marketing cards.

## Tool page shell

```text
← Back   Drop Server
──────────────────────────────────────────────────────────────

                 tool-specific workspace
```

Back is always easy to find.

## Env scrubber

Use `react-resizable-panels`:

```text
INPUT                  │ OUTPUT
                       │
                       │
───────────────────────┼──────────────────────────────────────
```

Panels need sensible min sizes. On narrow windows, switch to vertical stack rather than forcing unusable horizontal panes.

## Drop server

Organize controls in one main flow rather than many cards:

```text
Network        [ Wi-Fi · 192.168.1.24 ▼ ]
Port           (•) 8090   ( ) Auto
Destination    ~/Downloads/Drop             [Choose]

[Start server]

Stopped
```

When running, make the URL the visual focal point with Copy beside it.

Recent uploads can be a compact table/list, not cards.

## Typography

Use system UI stack initially. Do not add a webfont dependency in V0.

Use monospace system stack for:

- IPs
- URLs
- ports
- paths
- env text
- sizes/technical IDs if useful

## Accessibility baseline

- visible keyboard focus;
- labels associated with controls;
- buttons are real buttons;
- tiles are links/buttons with readable accessible names;
- status is communicated by text, not color alone;
- resizable divider remains keyboard/assistive-technology usable according to library capabilities.
