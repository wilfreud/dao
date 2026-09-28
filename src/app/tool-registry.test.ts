import { describe, it, expect } from "vitest";
import { toolRegistry, assertRegistryInvariants } from "./tool-registry";
import type { ToolManifest } from "../contracts/tools";
import { FolderDown } from "lucide-react";

describe("toolRegistry", () => {
  it("contains drop-server, env-scrubber, port-inspector, and qr-generator tools", () => {
    expect(toolRegistry.map((t) => t.id)).toEqual([
      "drop-server",
      "env-scrubber",
      "port-inspector",
      "qr-generator",
    ]);
  });

  it("passes invariant checks for the production registry", () => {
    expect(() => assertRegistryInvariants(toolRegistry)).not.toThrow();
  });

  it("throws on duplicate IDs", () => {
    const invalidTools: ToolManifest[] = [
      toolRegistry[0],
      { ...toolRegistry[0], route: "/tools/other" as `/tools/${string}` },
    ];
    expect(() => assertRegistryInvariants(invalidTools)).toThrow(/Duplicate tool id/);
  });

  it("throws on duplicate routes", () => {
    const invalidTools: ToolManifest[] = [
      toolRegistry[0],
      { ...toolRegistry[1], id: "other", route: toolRegistry[0].route },
    ];
    expect(() => assertRegistryInvariants(invalidTools)).toThrow(/Duplicate tool route/);
  });

  it("throws on route mismatched with ID", () => {
    const invalidTools: ToolManifest[] = [
      {
        ...toolRegistry[0],
        id: "custom-tool",
        route: "/tools/different-path",
      },
    ];
    expect(() => assertRegistryInvariants(invalidTools)).toThrow(/does not match convention/);
  });

  it("throws on empty intent and example phrases", () => {
    const invalidTools: ToolManifest[] = [
      {
        id: "sample-tool",
        route: "/tools/sample-tool",
        name: "Sample",
        description: "Sample",
        category: "developer",
        icon: FolderDown,
        search: {
          aliases: [],
          intents: [],
          examples: [],
        },
      },
    ];
    expect(() => assertRegistryInvariants(invalidTools)).toThrow(/must have at least one intent or example/);
  });
});
