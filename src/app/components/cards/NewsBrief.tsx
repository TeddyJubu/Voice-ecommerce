import { Newspaper, ExternalLink } from "lucide-react";

export interface NewsItem {
  title: string;
  source: string;
  time: string;
  snippet: string;
  url: string;
}

export interface NewsBriefProps {
  topic: string;
  articles: NewsItem[];
}

export function NewsBrief({ topic, articles }: NewsBriefProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-purple-600" />
          <h3>News: {topic}</h3>
        </div>
      </div>
      <div className="divide-y divide-border">
        {articles.map((a, i) => (
          <a
            key={i}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 hover:bg-accent/30 transition-colors group"
          >
            <div className="flex items-start justify-between gap-2">
              <h4 className="group-hover:text-blue-700 transition-colors">{a.title}</h4>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-muted-foreground mt-1 line-clamp-2" style={{ fontSize: '0.875rem' }}>{a.snippet}</p>
            <div className="flex items-center gap-2 mt-2 text-muted-foreground" style={{ fontSize: '0.75rem' }}>
              <span>{a.source}</span>
              <span>·</span>
              <span>{a.time}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
