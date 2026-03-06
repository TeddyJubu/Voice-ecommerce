import { CheckCircle2 } from "lucide-react";

export interface Step {
  step: number;
  title: string;
  description: string;
}

export interface HowToStepsProps {
  title: string;
  steps: Step[];
  source?: string;
}

export function HowToSteps({ title, steps, source }: HowToStepsProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm p-5">
      <h3 className="mb-4">{title}</h3>
      <div className="space-y-4">
        {steps.map((s) => (
          <div key={s.step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                {s.step}
              </div>
              {s.step < steps.length && (
                <div className="w-px h-full bg-border mt-1" />
              )}
            </div>
            <div className="pb-4">
              <h4>{s.title}</h4>
              <p className="text-muted-foreground mt-0.5" style={{ fontSize: '0.875rem' }}>{s.description}</p>
            </div>
          </div>
        ))}
      </div>
      {source && (
        <div className="mt-2 flex items-center gap-1.5 text-muted-foreground" style={{ fontSize: '0.75rem' }}>
          <CheckCircle2 className="h-3 w-3" />
          Source: {source}
        </div>
      )}
    </div>
  );
}
