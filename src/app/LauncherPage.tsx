import React, { useEffect, useRef, useMemo } from "react";
import { Link } from "react-router";
import { Search, X } from "lucide-react";
import { toolRegistry } from "./tool-registry";
import { defaultSearchEngine } from "./search/fuse-search-engine";
import { useLauncherState } from "./launcher-state";

export function LauncherPage() {
  const { query, setQuery, scrollPosition, setScrollPosition } =
    useLauncherState();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus search input on initial load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Restore scroll position when returning from tool
  useEffect(() => {
    if (scrollPosition > 0) {
      window.scrollTo(0, scrollPosition);
    }
  }, [scrollPosition]);

  // Compute search hits
  const searchHits = useMemo(() => {
    return defaultSearchEngine.search(query, toolRegistry);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape" && query) {
      e.preventDefault();
      setQuery("");
    }
  };

  const handleTileClick = () => {
    setScrollPosition(window.scrollY);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex flex-col items-center">
      <main className="w-full max-w-3xl px-6 pt-16 pb-24">
        {/* Search header area */}
        <div className="mb-10 text-center">
          <h1 className="text-xl font-medium tracking-tight text-[var(--text-primary)] mb-1">
            Workbench
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            Search tools or describe a task
          </p>
        </div>

        {/* Search input container */}
        <div className="relative mb-10">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
            <Search className="w-4 h-4" />
          </div>
          <input
            ref={inputRef}
            type="text"
            role="searchbox"
            aria-label="Search tools or describe a task"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. receive a file from my phone, sanitize .env..."
            className="w-full pl-10 pr-10 py-2.5 text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] rounded focus:border-[var(--accent)] placeholder:text-[var(--text-muted)] focus:outline-none transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results grid or no-results state */}
        {searchHits.length > 0 ? (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            role="region"
            aria-label="Available tools"
          >
            {searchHits.map(({ tool }) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.id}
                  to={tool.route}
                  state={{ fromLauncher: true }}
                  onClick={handleTileClick}
                  className="group block p-4 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] rounded transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <h2 className="text-sm font-medium text-[var(--text-primary)]">
                        {tool.name}
                      </h2>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                      {tool.category}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                    {tool.description}
                  </p>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 px-4 border border-dashed border-[var(--border-subtle)] rounded bg-[var(--bg-surface)]/50">
            <p className="text-sm text-[var(--text-secondary)]">
              No tools matching &ldquo;{query}&rdquo;
            </p>
            <p className="mt-1.5 text-xs text-[var(--text-muted)]">
              Try searching by task like &ldquo;receive file&rdquo; or &ldquo;strip env&rdquo;, or press <kbd className="px-1 py-0.5 text-[10px] font-mono bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded">Esc</kbd> to reset.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
