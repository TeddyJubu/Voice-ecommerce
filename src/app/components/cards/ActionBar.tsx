import { ChevronRight } from "lucide-react";

export interface Action {
  label: string;
  query?: string;
}

export interface ActionBarProps {
  actions: Action[];
  onAction?: (action: Action) => void;
}

export function ActionBar({ actions, onAction }: ActionBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a, i) => (
        <button
          key={i}
          onClick={() => onAction?.(a)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border bg-card hover:bg-accent/50 transition-colors text-primary"
          style={{ fontSize: '0.875rem' }}
        >
          {a.label}
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}
