import { motion, AnimatePresence } from "motion/react";
import {
  Ear,
  BrainCircuit,
  Zap,
  AudioLines,
  Radio,
  TrendingDown,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import type {
  PipelineStage,
  AlwaysListeningState,
} from "./useAlwaysListening";

interface AlwaysListeningIndicatorProps {
  state: AlwaysListeningState;
  compact?: boolean;
}

const STAGE_CONFIG: Record<
  PipelineStage,
  { label: string; icon: React.ElementType; color: string; bgColor: string }
> = {
  idle: {
    label: "Waiting for \"Friday\"",
    icon: Ear,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  hearing: {
    label: "Hearing speech…",
    icon: AudioLines,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  "wake-detected": {
    label: "Friday activated!",
    icon: Sparkles,
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
  },
  transcribing: {
    label: "Transcribing",
    icon: Radio,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  routing: {
    label: "Routing to LLM",
    icon: Zap,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  inferring: {
    label: "Thinking",
    icon: BrainCircuit,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  complete: {
    label: "Done",
    icon: Zap,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  error: {
    label: "Error",
    icon: Zap,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
};

export function AlwaysListeningIndicator({
  state,
  compact = false,
}: AlwaysListeningIndicatorProps) {
  const config = STAGE_CONFIG[state.stage];
  const Icon = config.icon;

  if (!state.enabled) return null;

  // ── Compact mode: just a pulsing dot + stage label in header ──
  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="relative">
          <div
            className={`w-2 h-2 rounded-full ${
              state.wakeWordDetected
                ? "bg-violet-500"
                : state.stage === "idle"
                ? "bg-emerald-500"
                : state.stage === "hearing"
                ? "bg-blue-500"
                : "bg-amber-500"
            }`}
          />
          {(state.stage === "idle" || state.stage === "hearing") && (
            <motion.div
              className={`absolute inset-0 rounded-full ${
                state.stage === "idle" ? "bg-emerald-500" : "bg-blue-500"
              }`}
              animate={{ scale: [1, 2.2, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </div>
        <span
          className={`${state.wakeWordDetected ? "text-violet-500" : config.color}`}
          style={{ fontSize: "0.6875rem", fontWeight: 500 }}
        >
          {state.wakeWordDetected && state.stage !== "wake-detected"
            ? `Friday · ${config.label}`
            : config.label}
        </span>
      </div>
    );
  }

  // ── Full mode: pipeline strip + live transcription + metrics ──
  return (
    <div className="space-y-2">
      {/* Pipeline stage strip */}
      <motion.div
        layout
        className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
          state.wakeWordDetected ? "bg-violet-500/10" : config.bgColor
        } transition-colors`}
      >
        <motion.div
          key={state.stage}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="shrink-0"
        >
          <Icon className={`h-4 w-4 ${state.wakeWordDetected ? "text-violet-500" : config.color}`} />
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={state.wakeWordDetected ? "text-violet-500" : config.color} style={{ fontSize: "0.75rem", fontWeight: 600 }}>
              {config.label}
            </span>
            {state.provider && state.stage === "inferring" && (
              <span
                className="px-1.5 py-0.5 rounded bg-black/5 text-muted-foreground"
                style={{ fontSize: "0.625rem", fontWeight: 600, letterSpacing: "0.05em" }}
              >
                {state.provider === "cerebras"
                  ? "CEREBRAS 120B"
                  : "NEBIUS FALLBACK"}
              </span>
            )}
            {state.stage === "transcribing" && state.sttMode === "whisper" && (
              <span
                className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600"
                style={{ fontSize: "0.625rem", fontWeight: 600, letterSpacing: "0.05em" }}
              >
                GROQ WHISPER
              </span>
            )}
          </div>

          {/* Partial transcript while transcribing */}
          <AnimatePresence>
            {state.partialTranscript && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-foreground truncate mt-0.5"
                style={{ fontSize: "0.8125rem" }}
              >
                {state.partialTranscript}
                <motion.span
                  animate={{ opacity: [0, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="inline-block w-0.5 h-3.5 bg-current ml-0.5 align-text-bottom"
                />
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Audio level meter */}
        {(state.stage === "idle" || state.stage === "hearing") && (
          <div className="flex items-end gap-px h-4 shrink-0">
            {[0, 1, 2, 3, 4].map((i) => {
              const barThreshold = (i + 1) * 0.2;
              const isActive = state.audioLevel >= barThreshold;
              return (
                <motion.div
                  key={i}
                  className={`w-0.5 rounded-full ${
                    isActive ? "bg-emerald-500" : "bg-emerald-500/20"
                  }`}
                  animate={{
                    height: isActive
                      ? `${Math.max(4, state.audioLevel * 16)}px`
                      : "3px",
                  }}
                  transition={{ duration: 0.1 }}
                />
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Live transcription strip */}
      <AnimatePresence>
        {state.showTranscription && state.liveTranscription && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/30">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p
                  className={`truncate ${
                    state.liveTranscription.toLowerCase().includes(state.wakeWordName.toLowerCase())
                      ? "text-violet-600"
                      : "text-muted-foreground"
                  }`}
                  style={{ fontSize: "0.8125rem" }}
                >
                  {highlightWakeWord(state.liveTranscription, state.wakeWordName)}
                  <motion.span
                    animate={{ opacity: [0, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="inline-block w-0.5 h-3 bg-muted-foreground/50 ml-0.5 align-text-bottom"
                  />
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Metrics strip */}
      {state.metrics && state.stage === "complete" && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-muted/30"
          style={{ fontSize: "0.6875rem" }}
        >
          <span className="text-muted-foreground">
            <Zap className="inline h-3 w-3 mr-0.5" />
            {state.metrics.totalLatencyMs}ms total
          </span>
          <span className="text-muted-foreground">
            STT {state.metrics.sttLatencyMs}ms
          </span>
          <span className="text-muted-foreground">
            LLM {state.metrics.llmLatencyMs}ms
          </span>
          <span
            className={`ml-auto ${
              state.metrics.provider === "cerebras"
                ? "text-emerald-600"
                : "text-sky-600"
            }`}
            style={{ fontWeight: 600 }}
          >
            {state.metrics.provider === "cerebras"
              ? "Cerebras"
              : "Nebius"}
          </span>
        </motion.div>
      )}

      {/* Session cost tracker */}
      {state.utteranceCount > 0 && (
        <div
          className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/20"
          style={{ fontSize: "0.6875rem" }}
        >
          <div className="flex items-center gap-3 text-muted-foreground">
            <span>{state.utteranceCount} utterances</span>
            <span>
              Wake hit: {state.gatePassRate.toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">
              ${state.sessionCreditsUsed.toFixed(4)} used
            </span>
            {state.sessionCreditsSaved > 0 && (
              <span className="text-emerald-600 flex items-center gap-0.5" style={{ fontWeight: 600 }}>
                <TrendingDown className="h-3 w-3" />${state.sessionCreditsSaved.toFixed(4)} saved
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to highlight the wake word in transcription text
function highlightWakeWord(text: string, wakeWord: string): React.ReactNode {
  const regex = new RegExp(`(${wakeWord})`, "gi");
  const parts = text.split(regex);

  if (parts.length === 1) return text;

  return parts.map((part, i) =>
    part.toLowerCase() === wakeWord.toLowerCase() ? (
      <span key={i} className="text-violet-500" style={{ fontWeight: 600 }}>
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}