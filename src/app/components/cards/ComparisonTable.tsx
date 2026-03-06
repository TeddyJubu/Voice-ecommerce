export interface ComparisonTableProps {
  headers: string[];
  rows: string[][];
  highlightBest?: number;
}

export function ComparisonTable({ headers, rows, highlightBest }: ComparisonTableProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="px-4 py-3 text-left text-muted-foreground whitespace-nowrap"
                  style={{ fontSize: '0.875rem' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, ri) => (
              <tr
                key={ri}
                className={`${ri === highlightBest ? "bg-green-50" : ""} hover:bg-accent/30 transition-colors`}
              >
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-3 whitespace-nowrap" style={{ fontSize: '0.875rem' }}>
                    {ri === highlightBest && ci === 0 ? (
                      <span>
                        {cell} <span className="text-green-600 ml-1" style={{ fontSize: '0.75rem' }}>★ Best</span>
                      </span>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
