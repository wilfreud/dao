import type { ToolManifest } from "../contracts/tools";
import { dropServerManifest } from "../tools/drop-server/manifest";
import { envScrubberManifest } from "../tools/env-scrubber/manifest";

export function assertRegistryInvariants(
  tools: readonly ToolManifest[]
): void {
  const seenIds = new Set<string>();
  const seenRoutes = new Set<string>();

  for (const tool of tools) {
    if (!tool.id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(tool.id)) {
      throw new Error(`Tool invariant violation: Invalid kebab-case id "${tool.id}"`);
    }

    if (seenIds.has(tool.id)) {
      throw new Error(`Tool invariant violation: Duplicate tool id "${tool.id}"`);
    }
    seenIds.add(tool.id);

    if (seenRoutes.has(tool.route)) {
      throw new Error(`Tool invariant violation: Duplicate tool route "${tool.route}"`);
    }
    seenRoutes.add(tool.route);

    if (tool.route !== `/tools/${tool.id}`) {
      throw new Error(
        `Tool invariant violation: Route "${tool.route}" does not match convention "/tools/${tool.id}"`
      );
    }

    if (!tool.search.intents.length && !tool.search.examples.length) {
      throw new Error(
        `Tool invariant violation: Tool "${tool.id}" must have at least one intent or example`
      );
    }
  }
}

export const toolRegistry: readonly ToolManifest[] = Object.freeze([
  dropServerManifest,
  envScrubberManifest,
]);

// Validate static registry invariants on module initialization
assertRegistryInvariants(toolRegistry);
