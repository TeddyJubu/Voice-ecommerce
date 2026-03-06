import { useState, useEffect } from "react";
import { Clock, Trash2, Search, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";

interface HistoryEntry {
  query: string;
  timestamp: Date;
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("voice-assistant-history");
      if (saved) {
        setHistory(
          JSON.parse(saved).map((e: any) => ({
            ...e,
            timestamp: new Date(e.timestamp),
          }))
        );
      }
    } catch {}
  }, []);

  const filtered = history.filter((h) =>
    h.query.toLowerCase().includes(filter.toLowerCase())
  );

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("voice-assistant-history");
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1>History</h1>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-destructive hover:bg-red-50 transition-colors"
              style={{ fontSize: '0.875rem' }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </button>
          )}
        </div>

        {history.length > 0 && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search history..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}

        {history.length === 0 ? (
          <div className="text-center py-16">
            <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No history yet. Start by asking a question!</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card shadow-sm divide-y divide-border">
            <AnimatePresence>
              {filtered.map((entry, i) => (
                <motion.button
                  key={`${entry.query}-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => navigate("/")}
                  className="w-full flex items-center gap-3 p-4 hover:bg-accent/30 transition-colors text-left group"
                >
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{entry.query}</p>
                    <span className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>
                      {formatTime(entry.timestamp)}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </motion.button>
              ))}
            </AnimatePresence>
            {filtered.length === 0 && filter && (
              <div className="p-8 text-center text-muted-foreground">
                No results for "{filter}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
