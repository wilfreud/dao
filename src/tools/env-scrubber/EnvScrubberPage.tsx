import { ToolPageHeader } from "../../foundation/ui";
import { envScrubberManifest } from "./manifest";

export function EnvScrubberPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-app)]">
      <ToolPageHeader
        title={envScrubberManifest.name}
        category={envScrubberManifest.category}
      />
      <main className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-sm text-[var(--text-secondary)]">
            {envScrubberManifest.description}
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-muted)] border border-[var(--border-subtle)] rounded bg-[var(--bg-surface)]">
            <span>Env Scrubber workspace placeholder (Handoff 03)</span>
          </div>
        </div>
      </main>
    </div>
  );
}
