import type { ToolManifest, ToolSearchHit } from "../../contracts/tools";

export interface ToolSearchEngine {
  search(
    query: string,
    tools: readonly ToolManifest[]
  ): readonly ToolSearchHit[];
}
