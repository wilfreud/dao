import React from "react";
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { LauncherStateProvider, useLauncherState } from "./launcher-state";

describe("LauncherStateProvider", () => {
  it("provides default query and scroll position", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LauncherStateProvider>{children}</LauncherStateProvider>
    );

    const { result } = renderHook(() => useLauncherState(), { wrapper });

    expect(result.current.query).toBe("");
    expect(result.current.scrollPosition).toBe(0);
  });

  it("updates and resets query and scroll position", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LauncherStateProvider>{children}</LauncherStateProvider>
    );

    const { result } = renderHook(() => useLauncherState(), { wrapper });

    act(() => {
      result.current.setQuery("drop");
      result.current.setScrollPosition(150);
    });

    expect(result.current.query).toBe("drop");
    expect(result.current.scrollPosition).toBe(150);

    act(() => {
      result.current.reset();
    });

    expect(result.current.query).toBe("");
    expect(result.current.scrollPosition).toBe(0);
  });

  it("throws error when used outside provider", () => {
    expect(() => renderHook(() => useLauncherState())).toThrow(
      "useLauncherState must be used within a LauncherStateProvider"
    );
  });
});
