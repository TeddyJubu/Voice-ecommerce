import { Info } from "lucide-react";

export interface InfoCardProps {
  title: string;
  body: string;
  icon?: string;
}

export function InfoCard({ title, body }: InfoCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-primary/10 p-2">
          <Info className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="mb-1">{title}</h3>
          <p className="text-muted-foreground">{body}</p>
        </div>
      </div>
    </div>
  );
}
