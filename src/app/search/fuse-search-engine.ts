import Fuse, { type IFuseOptions } from "fuse.js";
import type { ToolManifest, ToolSearchHit } from "../../contracts/tools";
import type { ToolSearchEngine } from "./search-engine";

const DEFAULT_FUSE_OPTIONS: IFuseOptions<ToolManifest> = {
  includeScore: true,
  shouldSort: true,
  threshold: 0.65,
  ignoreLocation: true,
  keys: [
    { name: "name", weight: 4 },
    { name: "search.aliases", weight: 3 },
    { name: "description", weight: 2 },
    { name: "search.intents", weight: 2.5 },
    { name: "search.examples", weight: 2.5 },
  ],
};

export class FuseSearchEngine implements ToolSearchEngine {
  private readonly fuseOptions: IFuseOptions<ToolManifest>;

  constructor(options: Partial<IFuseOptions<ToolManifest>> = {}) {
    this.fuseOptions = { ...DEFAULT_FUSE_OPTIONS, ...options };
  }

  search(
    query: string,
    tools: readonly ToolManifest[]
  ): readonly ToolSearchHit[] {
    const trimmed = query.trim();

    if (!trimmed) {
      return tools.map((tool) => ({
        tool,
        relevance: 1,
      }));
    }

    const fuse = new Fuse(tools as ToolManifest[], this.fuseOptions);
    const results = fuse.search(trimmed);

    // Filter out noisy hits with score > 0.65 (relevance < 0.35)
    return results
      .filter((result) => (result.score ?? 1) <= 0.65)
      .map((result) => ({
        tool: result.item,
        // Normalized UI relevance where 1 is highest relevance and 0 is lowest
        relevance: Math.max(0, 1 - (result.score ?? 0)),
      }));
  }
}

export const defaultSearchEngine = new FuseSearchEngine();
