import { describe, it, expect, vi, beforeEach } from "vitest";
import { copyText } from "./index";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({
  writeText: vi.fn(),
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
