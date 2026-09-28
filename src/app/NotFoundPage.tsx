import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--bg-app)] text-center">
      <h1 className="text-xl font-medium text-[var(--text-primary)]">
        Tool Not Found
      </h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        The requested path does not exist in this workbench.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)] rounded transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to launcher</span>
      </Link>
    </div>
  );
}
