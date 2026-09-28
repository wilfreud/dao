import type { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router";
import { ArrowLeft } from "lucide-react";

export interface ToolPageHeaderProps {
  title: string;
  category?: string;
  actions?: ReactNode;
}

export function ToolPageHeader({
  title,
  category,
  actions,
}: ToolPageHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    const state = location.state as { fromLauncher?: boolean } | null;
    if (state?.fromLauncher) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back to launcher"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)] rounded transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-medium text-[var(--text-primary)]">
            {title}
          </h1>
          {category && (
            <span className="text-[10px] tracking-wider uppercase text-[var(--text-muted)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
              {category}
            </span>
          )}
        </div>
      </div>
      {actions && <div>{actions}</div>}
    </header>
  );
}
