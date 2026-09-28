import { describe, it, expect, vi, beforeEach } from "vitest";
import { copyText, copyImage } from "./index";
import { writeText, writeImage } from "@tauri-apps/plugin-clipboard-manager";

vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({
  writeText: vi.fn(),
  writeImage: vi.fn(),
}));

describe("copyText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls writeText with the provided string", async () => {
    vi.mocked(writeText).mockResolvedValue(undefined);

    await copyText("http://192.168.1.50:8090");

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith("http://192.168.1.50:8090");
  });

  it("propagates errors when writeText fails", async () => {
    vi.mocked(writeText).mockRejectedValue(new Error("clipboard permission denied"));

    await expect(copyText("test")).rejects.toThrow("clipboard permission denied");
  });
});

describe("copyImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls writeImage with the provided byte array", async () => {
    vi.mocked(writeImage).mockResolvedValue(undefined);

    const testBytes = new Uint8Array([1, 2, 3, 4]);
    await copyImage(testBytes);

    expect(writeImage).toHaveBeenCalledTimes(1);
    expect(writeImage).toHaveBeenCalledWith(testBytes);
  });

  it("propagates errors when writeImage fails", async () => {
    vi.mocked(writeImage).mockRejectedValue(new Error("clipboard image write denied"));

    const testBytes = new Uint8Array([1, 2, 3, 4]);
    await expect(copyImage(testBytes)).rejects.toThrow("clipboard image write denied");
  });
});
