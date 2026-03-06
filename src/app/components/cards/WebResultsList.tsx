import { ExternalLink, Globe } from "lucide-react";

export interface WebResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface WebResultsListProps {
  results: WebResult[];
}

export function WebResultsList({ results }: WebResultsListProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm divide-y divide-border">
      {results.map((r, i) => (
        <a
          key={i}
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 p-4 hover:bg-accent/50 transition-colors group first:rounded-t-xl last:rounded-b-xl"
        >
          <div className="mt-1 rounded-lg bg-blue-50 p-2 shrink-0">
            <Globe className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-blue-700 group-hover:underline truncate">{r.title}</h4>
              <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-muted-foreground mt-0.5 line-clamp-2">{r.snippet}</p>
            <span className="text-muted-foreground/70 mt-1 inline-block" style={{ fontSize: '0.75rem' }}>{r.source}</span>
          </div>
        </a>
      ))}
    </div>
  );
}
