# Agent architecture

`AGENTS.md` is the repository-level router. It contains stable laws.

`.agents/skills/` contains focused implementation disciplines. Skills are intentionally separate so an agent can load only what is relevant to the current task.

The pack includes project-local adaptations of three disciplines already used by the project owner:

- defensive programming
- spec-locked TDD
- structural refactoring

Those adaptations are concise and specific to this repository; they are not intended as verbatim mirrors of the upstream skills repository.

Project-specific skills are:

- `tool-authoring`
- `tauri-boundaries`
- `ui-workbench`

Do not create new skills merely because a task is large. Add a skill only when a reusable coding discipline has emerged across multiple tools.
