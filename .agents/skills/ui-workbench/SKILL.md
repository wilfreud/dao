---
name: ui-workbench
description: Maintain a restrained desktop developer-workbench visual language rather than a SaaS dashboard aesthetic.
---

# UI workbench

## Direction

- tool-like, not dashboard-like
- compact, calm, functional
- low decorative density
- few borders and few cards
- restrained corner radii
- monospace only for machine data/code/IPs/ports/paths
- normal UI font for labels and prose
- keyboard-friendly controls
- visible focus states

## Launcher `/`

- dominant search field near the top
- responsive grid of tool tiles below
- tiles communicate name + one-line purpose, not KPI cards
- empty search returns all tools
- no permanent sidebar required

## Tool page

- small header with Back + tool title
- the rest is workspace
- input/output tools should use resizable split panes when that materially improves comparison
- avoid nested cards inside cards

## Feedback

- system states must be explicit (`Stopped`, `Starting`, `Running`, `Stopping`)
- errors appear near the action that caused them
- copying should produce lightweight confirmation
- dangerous/exposed behavior (LAN server) gets a concise warning, not a modal lecture
