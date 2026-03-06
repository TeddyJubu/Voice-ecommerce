export interface UIBlock {
  type: string;
  props: Record<string, unknown>;
}

export interface Scenario {
  query: string;
  summary: string;
  blocks: UIBlock[];
}

// ─── Default suggested queries ──────────────────────────────────────────────

const DEFAULT_SUGGESTIONS = [
  "Weather tomorrow in Dhaka",
  "Best noise cancelling earbuds under $100",
  "Latest AI news",
  "How to make cold brew coffee",
  "Bitcoin price",
  "Best ramen near me",
  "Compare iPhone 16 vs Samsung S25",
  "What's trending in tech",
  "How does solar energy work",
  "Best budget laptop 2026",
];

/**
 * Get suggested queries — mixes recent history topics with defaults
 * so the user sees personalized + fresh suggestions.
 *
 * @param maxCount - Max number of suggestions to return (default: 6)
 */
export function getSuggestedQueries(maxCount = 6): string[] {
  try {
    const saved = localStorage.getItem("voice-assistant-history");
    if (saved) {
      const history: Array<{ query: string }> = JSON.parse(saved);
      if (history.length > 0) {
        // Extract unique recent queries (max 2 from history)
        const recentQueries: string[] = [];
        const seen = new Set<string>();
        for (const entry of history) {
          const q = entry.query?.trim();
          if (q && !seen.has(q.toLowerCase())) {
            seen.add(q.toLowerCase());
            recentQueries.push(q);
            if (recentQueries.length >= 2) break;
          }
        }

        // Filter defaults to exclude anything already in history
        const filteredDefaults = DEFAULT_SUGGESTIONS.filter(
          (d) => !seen.has(d.toLowerCase())
        );

        // Shuffle defaults for variety
        const shuffled = filteredDefaults.sort(() => Math.random() - 0.5);

        // Combine: recent (max 2) + shuffled defaults
        const combined = [...recentQueries, ...shuffled];
        return combined.slice(0, maxCount);
      }
    }
  } catch {}

  // No history — return shuffled defaults
  return DEFAULT_SUGGESTIONS.sort(() => Math.random() - 0.5).slice(
    0,
    maxCount
  );
}

/** Static export for backward compatibility */
export const suggestedQueries = DEFAULT_SUGGESTIONS.slice(0, 6);
