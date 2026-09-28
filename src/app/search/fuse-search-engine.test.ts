import { describe, it, expect } from "vitest";
import { defaultSearchEngine } from "./fuse-search-engine";
import { toolRegistry } from "../tool-registry";

describe("FuseSearchEngine", () => {
  it("returns all tools with relevance 1 on empty query", () => {
    const hits = defaultSearchEngine.search("", toolRegistry);
    expect(hits).toHaveLength(toolRegistry.length);
    expect(hits.map((h) => h.tool.id)).toEqual([
      "drop-server",
      "env-scrubber",
      "port-inspector",
    ]);
    expect(hits.every((h) => h.relevance === 1)).toBe(true);
  });

  it("returns all tools on whitespace-only query", () => {
    const hits = defaultSearchEngine.search("   ", toolRegistry);
    expect(hits).toHaveLength(toolRegistry.length);
  });

  it("ranks Drop Server first for file-transfer natural language queries", () => {
    const queries = [
      "receive a file from my iphone",
      "local upload server",
      "send a file over wifi",
      "airdrop alternative",
      "transfer file over lan",
    ];

    for (const q of queries) {
      const hits = defaultSearchEngine.search(q, toolRegistry);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits[0].tool.id).toBe("drop-server");
      expect(hits[0].relevance).toBeGreaterThan(0.5);
    }
  });

  it("ranks Env Scrubber first for dotenv and secrets natural language queries", () => {
    const queries = [
      "remove passwords from env",
      "share dotenv without values",
      "strip secret values",
      "sanitize env",
      "empty environment variables",
    ];

    for (const q of queries) {
      const hits = defaultSearchEngine.search(q, toolRegistry);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits[0].tool.id).toBe("env-scrubber");
      expect(hits[0].relevance).toBeGreaterThan(0.5);
    }
  });

  it("ranks Port Inspector first for port inspection and process termination queries", () => {
    const queries = [
      "kill 3000",
      "who uses port 5432",
      "lsof",
      "port already in use",
      "find process by port",
    ];

    for (const q of queries) {
      const hits = defaultSearchEngine.search(q, toolRegistry);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits[0].tool.id).toBe("port-inspector");
      expect(hits[0].relevance).toBeGreaterThan(0.5);
    }
  });

  it("is tolerant to typos in tool names and intent queries", () => {
    const typoQueries = [
      { query: "drop servr", expectedId: "drop-server" },
      { query: "env scrubbr", expectedId: "env-scrubber" },
      { query: "dotnev", expectedId: "env-scrubber" },
      { query: "lan uplod", expectedId: "drop-server" },
    ];

    for (const { query, expectedId } of typoQueries) {
      const hits = defaultSearchEngine.search(query, toolRegistry);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits[0].tool.id).toBe(expectedId);
    }
  });

  it("returns empty hits for completely irrelevant queries", () => {
    const hits = defaultSearchEngine.search("xyzqwe12345nonexistent", toolRegistry);
    expect(hits).toHaveLength(0);
  });
});
