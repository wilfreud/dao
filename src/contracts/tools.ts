import type { LucideIcon } from "lucide-react";

export type ToolCategory = "network" | "text" | "files" | "developer";

export interface ToolManifest {
  readonly id: string;
  readonly route: `/tools/${string}`;
  readonly name: string;
  readonly description: string;
  readonly category: ToolCategory;
  readonly icon: LucideIcon;
  readonly search: {
    readonly aliases: readonly string[];
    readonly intents: readonly string[];
    readonly examples: readonly string[];
  };
}

export interface ToolSearchHit {
  readonly tool: ToolManifest;
  /** normalized UI relevance where larger means better */
  readonly relevance: number;
}
