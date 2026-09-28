import { ToolPageHeader } from "../../foundation/ui";
import { dropServerManifest } from "./manifest";

export function DropServerPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-app)]">
      <ToolPageHeader
        title={dropServerManifest.name}
        category={dropServerManifest.category}
      />
      <main className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-sm text-[var(--text-secondary)]">
            {dropServerManifest.description}
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-muted)] border border-[var(--border-subtle)] rounded bg-[var(--bg-surface)]">
            <span>Drop Server workspace placeholder (Handoff 02)</span>
          </div>
        </div>
      </main>
    </div>
  );
}
