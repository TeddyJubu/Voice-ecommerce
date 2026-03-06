import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, VolumeX, Sparkles } from "lucide-react";
import { VoiceInput } from "./VoiceInput";
import { ResultsCanvas } from "./ResultsCanvas";
import { SkeletonCard } from "./cards/SkeletonCard";
import { getSuggestedQueries } from "./mockScenarios";
import { useAlwaysListening } from "./useAlwaysListening";
import { queryLLMStream } from "../../lib/llm";
import type { Scenario } from "./mockScenarios";
import type { LLMProviderName } from "../../lib/llm";

interface HistoryEntry {
  query: string;
  scenario: Scenario;
  timestamp: Date;
}

export default function HomePage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(
    null
  );
  const [pendingQuery, setPendingQuery] = useState<string>("");
  const [streamingSummary, setStreamingSummary] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [alwaysListeningEnabled, setAlwaysListeningEnabled] = useState(false);
  const [activeProvider, setActiveProvider] = useState<LLMProviderName | null>(
    null
  );
  const [suggestions, setSuggestions] = useState<string[]>(() =>
    getSuggestedQueries(6)
  );
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem("voice-assistant-history");
      if (saved) {
        return JSON.parse(saved).map((e: any) => ({
          ...e,
          timestamp: new Date(e.timestamp),
        }));
      }
    } catch {}
    return [];
  });
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem("voice-assistant-history", JSON.stringify(history));
    } catch {}
  }, [history]);

  // Refresh suggestions when history changes
  useEffect(() => {
    setSuggestions(getSuggestedQueries(6));
  }, [history]);

  const handleQuery = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setPendingQuery(text);
    setCurrentScenario(null);
    setIsSpeaking(false);
    setActiveProvider(null);
    setStreamingSummary("");

    try {
      // Use streaming query — onChunk fires for each text delta
      const { scenario, provider } = await queryLLMStream(
        text,
        (_chunk: string) => {
          // We don't stream the raw chunks to UI since they contain JSON,
          // not just the summary. The full parse happens on completion.
        }
      );

      setActiveProvider(provider);
      const entry: HistoryEntry = {
        query: text,
        scenario: { ...scenario, query: text },
        timestamp: new Date(),
      };
      setCurrentScenario(entry.scenario);
      setHistory((prev) => [entry, ...prev].slice(0, 50));

      // Stream the summary text character by character for a nice effect
      const summary = scenario.summary;
      setStreamingSummary("");
      let i = 0;
      const streamInterval = setInterval(() => {
        i += 2; // 2 chars at a time for speed
        if (i >= summary.length) {
          setStreamingSummary(summary);
          clearInterval(streamInterval);
          setTimeout(() => setIsSpeaking(true), 200);
          setTimeout(() => setIsSpeaking(false), 4000);
        } else {
          setStreamingSummary(summary.slice(0, i));
        }
      }, 15);
    } catch (err) {
      console.error("[HomePage] queryLLM error:", err);
    } finally {
      setIsProcessing(false);
      setPendingQuery("");
    }
  }, []);

  // Always-listening orchestration
  const {
    state: alState,
    enable: enableAL,
    disable: disableAL,
    manualTrigger,
    toggleTranscription,
  } = useAlwaysListening({
    onQueryReady: handleQuery,
    enabled: alwaysListeningEnabled,
    wakeWord: "Friday",
  });

  const toggleAlwaysListening = useCallback(() => {
    if (alwaysListeningEnabled) {
      disableAL();
      setAlwaysListeningEnabled(false);
    } else {
      setAlwaysListeningEnabled(true);
      enableAL();
    }
  }, [alwaysListeningEnabled, enableAL, disableAL]);

  const handleAction = (action: { label: string; query?: string }) => {
    if (action.query) {
      handleQuery(action.query);
    }
  };

  const toggleSpeaking = () => {
    setIsSpeaking((prev) => !prev);
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 pb-40">
          {/* Empty state */}
          <AnimatePresence mode="wait">
            {!currentScenario && !isProcessing && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center pt-12 pb-8"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/5 mb-6">
                  <Sparkles className="h-8 w-8 text-primary/60" />
                </div>
                <h1 className="mb-2">Talk to search.</h1>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {alwaysListeningEnabled
                    ? 'Say "Friday" to get my attention. I\'ll only respond when you call my name.'
                    : "Get cards, not walls of text. Try asking by voice or type below."}
                </p>

                {/* STT mode indicator */}
                {alwaysListeningEnabled && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4"
                  >
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
                        alState.sttMode === "native"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : alState.sttMode === "whisper"
                          ? "bg-purple-500/10 text-purple-600"
                          : "bg-red-500/10 text-red-600"
                      }`}
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: 600,
                      }}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          alState.sttMode === "native"
                            ? "bg-emerald-500"
                            : alState.sttMode === "whisper"
                            ? "bg-purple-500"
                            : "bg-red-500"
                        }`}
                      />
                      {alState.sttMode === "native"
                        ? "Web Speech API"
                        : alState.sttMode === "whisper"
                        ? "Groq/Cerebras Whisper"
                        : "No STT available"}
                    </span>
                  </motion.div>
                )}

                {/* Architecture explainer */}
                {alwaysListeningEnabled && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 max-w-md mx-auto"
                  >
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: "VAD", desc: "Browser", cost: "Free" },
                        {
                          label: "Wake",
                          desc: '"Friday"',
                          cost: "Free",
                        },
                        {
                          label: "STT",
                          desc:
                            alState.sttMode === "native"
                              ? "Browser"
                              : "Whisper",
                          cost:
                            alState.sttMode === "native"
                              ? "Free"
                              : "$0.006/s",
                        },
                        {
                          label: "LLM",
                          desc: "Cerebras 120B",
                          cost: "$0.003",
                        },
                      ].map((tier, i) => (
                        <div
                          key={tier.label}
                          className="text-center p-2 rounded-lg bg-muted/30 border border-border/50"
                        >
                          <div
                            className="text-muted-foreground"
                            style={{
                              fontSize: "0.5625rem",
                              fontWeight: 600,
                              letterSpacing: "0.05em",
                            }}
                          >
                            TIER {i}
                          </div>
                          <div
                            style={{ fontSize: "0.75rem", fontWeight: 600 }}
                          >
                            {tier.label}
                          </div>
                          <div
                            className="text-muted-foreground"
                            style={{ fontSize: "0.625rem" }}
                          >
                            {tier.desc}
                          </div>
                          <div
                            className="text-emerald-600 mt-0.5"
                            style={{ fontSize: "0.5625rem", fontWeight: 600 }}
                          >
                            {tier.cost}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p
                      className="text-muted-foreground mt-3"
                      style={{ fontSize: "0.75rem" }}
                    >
                      {alState.sttMode === "native"
                        ? "Using native browser speech recognition. Wake word detection and STT are free."
                        : alState.sttMode === "whisper"
                        ? "Using Groq/Cerebras Whisper fallback. VAD runs locally, Whisper only transcribes when speech is detected."
                        : "No speech recognition available. Use text input instead."}
                    </p>
                  </motion.div>
                )}

                {/* Suggested queries — dynamic based on history */}
                <div className="mt-8 flex flex-wrap gap-2 justify-center">
                  {suggestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleQuery(q)}
                      className="px-3.5 py-2 rounded-full border border-border bg-card hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-all"
                      style={{ fontSize: "0.875rem" }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading skeletons */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4 mt-4"
              >
                {pendingQuery && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/30">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-primary/60"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                    </div>
                    <span
                      className="text-muted-foreground"
                      style={{ fontSize: "0.875rem" }}
                    >
                      Searching for{" "}
                      <em className="text-foreground not-italic">
                        "{pendingQuery}"
                      </em>
                      …
                    </span>
                  </div>
                )}
                <SkeletonCard />
                <SkeletonCard />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
          <AnimatePresence>
            {currentScenario && !isProcessing && (
              <motion.div
                ref={resultsRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 mt-4"
              >
                {/* Summary with streaming text + TTS indicator */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30">
                  <button
                    onClick={toggleSpeaking}
                    className={`mt-0.5 p-1.5 rounded-lg shrink-0 transition-colors ${
                      isSpeaking
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {isSpeaking ? (
                      <Volume2 className="h-4 w-4" />
                    ) : (
                      <VolumeX className="h-4 w-4" />
                    )}
                  </button>
                  <div className="flex-1">
                    <p className="text-foreground">
                      {streamingSummary || currentScenario.summary}
                      {streamingSummary &&
                        streamingSummary.length <
                          currentScenario.summary.length && (
                          <motion.span
                            animate={{ opacity: [0, 1] }}
                            transition={{ duration: 0.4, repeat: Infinity }}
                            className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-text-bottom"
                          />
                        )}
                    </p>
                    {/* Provider badge */}
                    {activeProvider && activeProvider !== "error" && (
                      <div
                        className="flex items-center gap-2 mt-2 text-muted-foreground"
                        style={{ fontSize: "0.6875rem" }}
                      >
                        <span
                          className={`px-1.5 py-0.5 rounded ${
                            activeProvider === "cerebras"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : activeProvider === "groq"
                              ? "bg-orange-500/10 text-orange-600"
                              : activeProvider === "nebius"
                              ? "bg-sky-500/10 text-sky-600"
                              : "bg-purple-500/10 text-purple-600"
                          }`}
                          style={{ fontWeight: 600 }}
                        >
                          {activeProvider === "cerebras"
                            ? "Cerebras GPT-OSS 120B"
                            : activeProvider === "groq"
                            ? "Groq Llama 3.3 70B"
                            : activeProvider === "nebius"
                            ? "Nebius Token Factory"
                            : "Pollinations Search"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* UI Blocks */}
                <ResultsCanvas
                  blocks={currentScenario.blocks}
                  onAction={handleAction}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Fixed input at bottom */}
      <div className="sticky bottom-0 bg-gradient-to-t from-background via-background to-background/0 pt-6 pb-4 px-4">
        <div className="max-w-2xl mx-auto">
          <VoiceInput
            onSubmit={handleQuery}
            isProcessing={isProcessing}
            alwaysListeningState={alState}
            onToggleAlwaysListening={toggleAlwaysListening}
            onManualTrigger={manualTrigger}
            onToggleTranscription={toggleTranscription}
          />
        </div>
      </div>
    </div>
  );
}
