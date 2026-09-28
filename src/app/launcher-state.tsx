import React, { createContext, useContext, useState, useMemo } from "react";

export interface LauncherState {
  query: string;
  setQuery: (query: string) => void;
  scrollPosition: number;
  setScrollPosition: (pos: number) => void;
  reset: () => void;
}

const LauncherStateContext = createContext<LauncherState | null>(null);

export function LauncherStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [scrollPosition, setScrollPosition] = useState(0);

  const value = useMemo(
    () => ({
      query,
      setQuery,
      scrollPosition,
      setScrollPosition,
      reset: () => {
        setQuery("");
        setScrollPosition(0);
      },
    }),
    [query, scrollPosition]
  );

  return (
    <LauncherStateContext.Provider value={value}>
      {children}
    </LauncherStateContext.Provider>
  );
}

export function useLauncherState(): LauncherState {
  const context = useContext(LauncherStateContext);
  if (!context) {
    throw new Error("useLauncherState must be used within a LauncherStateProvider");
  }
  return context;
}
