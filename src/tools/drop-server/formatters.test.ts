import { describe, it, expect } from "vitest";
import { formatBytes, formatTime } from "./formatters";

describe("formatBytes", () => {
  it("formats zero and negative values as 0 B", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(-10)).toBe("0 B");
    expect(formatBytes(NaN)).toBe("0 B");
  });

  it("formats bytes correctly", () => {
    expect(formatBytes(500)).toBe("500 B");
  });

  it("formats kilobytes correctly", () => {
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("formats megabytes correctly", () => {
    expect(formatBytes(1048576)).toBe("1 MB");
    expect(formatBytes(2621440)).toBe("2.5 MB");
  });

  it("formats gigabytes correctly", () => {
    expect(formatBytes(1073741824)).toBe("1 GB");
  });
});

describe("formatTime", () => {
  it("handles zero and invalid epoch ms gracefully", () => {
    expect(formatTime(0)).toBe("—");
    expect(formatTime(-1)).toBe("—");
    expect(formatTime(NaN)).toBe("—");
  });

  it("formats valid epoch timestamp", () => {
    const timeStr = formatTime(1700000000000);
    expect(typeof timeStr).toBe("string");
    expect(timeStr.length).toBeGreaterThan(0);
  });
});
