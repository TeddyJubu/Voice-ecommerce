import { useState, useRef, useCallback, useEffect } from "react";
import {
  hasNativeSpeechRecognition,
  hasGetUserMedia,
  hasMediaRecorder,
  createVAD,
  createRecorder,
  transcribeAudio,
  type VADHandle,
  type TranscriptionResult,
} from "../../lib/stt";

// ─── Types ──────────────────────────────────────────────────────────
export type PipelineStage =
  | "idle"
  | "hearing"
  | "wake-detected"
  | "transcribing"
  | "routing"
  | "inferring"
  | "complete"
  | "error";

export type LLMProvider = "cerebras" | "nebius";

export interface PipelineMetrics {
  vadLatencyMs: number;
  gateLatencyMs: number;
  sttLatencyMs: number;
  llmLatencyMs: number;
  totalLatencyMs: number;
  provider: LLMProvider;
  creditsUsed: number;
  creditsSaved: number;
}

export interface AlwaysListeningState {
  enabled: boolean;
  stage: PipelineStage;
  transcript: string;
  partialTranscript: string;
  liveTranscription: string;
  showTranscription: boolean;
  audioLevel: number;
  metrics: PipelineMetrics | null;
  sessionCreditsUsed: number;
  sessionCreditsSaved: number;
  gatePassRate: number;
  utteranceCount: number;
  provider: LLMProvider;
  wakeWordName: string;
  wakeWordDetected: boolean;
  sttMode: "native" | "whisper" | "none";
}

interface UseAlwaysListeningOptions {
  onQueryReady: (text: string) => void;
  enabled?: boolean;
  wakeWord?: string;
}

// ─── Cost model ─────────────────────────────────────────────────────
const COST_PER_STT_SECOND = 0.006;
const COST_PER_LLM_REQUEST = 0.003;

// ─── SpeechRecognition types ────────────────────────────────────────
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

// ─── Hook ───────────────────────────────────────────────────────────
export function useAlwaysListening({
  onQueryReady,
  enabled: enabledProp = true,
  wakeWord = "Friday",
}: UseAlwaysListeningOptions) {
  // Detect available STT mode
  const sttMode: "native" | "whisper" | "none" = hasNativeSpeechRecognition()
    ? "native"
    : hasGetUserMedia() && hasMediaRecorder()
    ? "whisper"
    : "none";

  const [state, setState] = useState<AlwaysListeningState>({
    enabled: enabledProp,
    stage: "idle",
    transcript: "",
    partialTranscript: "",
    liveTranscription: "",
    showTranscription: true,
    audioLevel: 0,
    metrics: null,
    sessionCreditsUsed: 0,
    sessionCreditsSaved: 0,
    gatePassRate: 100,
    utteranceCount: 0,
    provider: "cerebras",
    wakeWordName: wakeWord,
    wakeWordDetected: false,
    sttMode,
  });

  // Refs
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const vadRef = useRef<VADHandle | null>(null);
  const recorderRef = useRef<ReturnType<typeof createRecorder> | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const enabledRef = useRef(enabledProp);
  const busyRef = useRef(false);
  const wakeWordRef = useRef(wakeWord);
  wakeWordRef.current = wakeWord;
  const onQueryReadyRef = useRef(onQueryReady);
  onQueryReadyRef.current = onQueryReady;

  // Cumulative stats
  const statsRef = useRef({
    creditsUsed: 0,
    creditsSaved: 0,
    gatePass: 0,
    gateFail: 0,
    utteranceCount: 0,
  });

  const toggleTranscription = useCallback(() => {
    setState((s) => ({ ...s, showTranscription: !s.showTranscription }));
  }, []);

  // ─── Shared: process final transcript ────────────────────────────
  const processTranscript = useCallback(
    (text: string, sttDurationMs = 0) => {
      const trimmed = text.trim();
      if (!trimmed || busyRef.current) return;

      statsRef.current.utteranceCount++;

      const containsWakeWord = trimmed
        .toLowerCase()
        .includes(wakeWordRef.current.toLowerCase());

      if (!containsWakeWord) {
        // No wake word — silently ignore
        statsRef.current.gateFail++;
        const savedCost = COST_PER_STT_SECOND * 3 + COST_PER_LLM_REQUEST;
        statsRef.current.creditsSaved += savedCost;

        setState((s) => ({
          ...s,
          liveTranscription: trimmed,
          sessionCreditsSaved: statsRef.current.creditsSaved,
          utteranceCount: statsRef.current.utteranceCount,
          gatePassRate:
            statsRef.current.gatePass + statsRef.current.gateFail > 0
              ? (statsRef.current.gatePass /
                  (statsRef.current.gatePass + statsRef.current.gateFail)) *
                100
              : 100,
        }));

        // Clear transcription after a moment
        setTimeout(() => {
          if (enabledRef.current) {
            setState((s) => ({ ...s, liveTranscription: "", stage: "idle" }));
          }
        }, 1500);
        return;
      }

      // Wake word detected!
      busyRef.current = true;
      statsRef.current.gatePass++;

      setState((s) => ({
        ...s,
        stage: "wake-detected",
        wakeWordDetected: true,
        liveTranscription: trimmed,
        utteranceCount: statsRef.current.utteranceCount,
        gatePassRate:
          statsRef.current.gatePass + statsRef.current.gateFail > 0
            ? (statsRef.current.gatePass /
                (statsRef.current.gatePass + statsRef.current.gateFail)) *
              100
            : 100,
      }));

      // Strip wake word prefix
      const command = trimmed.replace(/^(hey\s+)?friday[,]?\s*/i, "").trim();

      if (command) {
        setTimeout(() => {
          if (!enabledRef.current) {
            busyRef.current = false;
            return;
          }
          setState((s) => ({
            ...s,
            stage: "inferring",
            transcript: command,
            liveTranscription: "",
          }));
          onQueryReadyRef.current(command);

          setTimeout(() => {
            setState((s) => ({
              ...s,
              stage: "idle",
              transcript: "",
              partialTranscript: "",
              liveTranscription: "",
              wakeWordDetected: false,
            }));
            busyRef.current = false;
          }, 800);
        }, 400);
      } else {
        // Wake word only, no command
        setState((s) => ({ ...s, stage: "idle", wakeWordDetected: false }));
        busyRef.current = false;
      }
    },
    []
  );

  // ═══════════════════════════════════════════════════════════════════
  //  MODE A: Native SpeechRecognition (Chrome, Edge)
  // ═══════════════════════════════════════════════════════════════════

  const startNativeRecognition = useCallback(() => {
    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (!enabledRef.current) return;

      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      const currentText = (final || interim).trim();
      if (currentText) {
        setState((s) => ({
          ...s,
          liveTranscription: currentText,
          stage: currentText ? "hearing" : s.stage,
        }));
      }

      if (final) {
        processTranscript(final);
      }
    };

    recognition.onerror = (event: { error: string }) => {
      console.warn("[AlwaysListening] SpeechRecognition error:", event.error);
      if (event.error === "not-allowed") {
        setState((s) => ({ ...s, stage: "error" }));
      }
    };

    recognition.onend = () => {
      if (enabledRef.current) {
        try {
          recognition.start();
        } catch {}
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {}
  }, [processTranscript]);

  const stopNativeRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  //  MODE B: Whisper fallback (Firefox, Safari, any browser with mic)
  //  Uses: getUserMedia → VAD → MediaRecorder → Groq/Cerebras Whisper
  // ═══════════════════════════════════════════════════════════════════

  const startWhisperListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      // Create VAD
      const vad = createVAD(stream, {
        silenceTimeoutMs: 1500,
        onsetMultiplier: 3.0,
        minOnsetEnergy: 0.015,
      });
      vadRef.current = vad;

      // Create recorder
      const recorder = createRecorder(stream);
      recorderRef.current = recorder;

      // Audio level metering via VAD
      const meterTick = () => {
        if (!enabledRef.current) return;
        const energy = vad.getEnergy();
        setState((s) => ({ ...s, audioLevel: energy }));
        animFrameRef.current = requestAnimationFrame(meterTick);
      };
      meterTick();

      // VAD callbacks
      vad.onSpeechStart(() => {
        if (!enabledRef.current || busyRef.current) return;
        setState((s) => ({ ...s, stage: "hearing" }));
        recorder.start();
      });

      vad.onSpeechEnd(async () => {
        if (!enabledRef.current) return;
        if (!recorder.isRecording()) return;

        setState((s) => ({ ...s, stage: "transcribing" }));
        try {
          const audioBlob = await recorder.stop();
          // Skip tiny blobs (< 1KB likely noise)
          if (audioBlob.size < 1024) {
            setState((s) => ({ ...s, stage: "idle" }));
            return;
          }

          const result: TranscriptionResult = await transcribeAudio(audioBlob);
          console.info(
            `[STT] ${result.provider}: "${result.text}" (${result.durationMs}ms)`
          );

          if (result.text) {
            // Show transcription
            setState((s) => ({
              ...s,
              liveTranscription: result.text,
            }));
            processTranscript(result.text, result.durationMs);
          } else {
            setState((s) => ({ ...s, stage: "idle" }));
          }
        } catch (err) {
          console.warn("[STT] Transcription failed:", err);
          setState((s) => ({ ...s, stage: "idle" }));
        }
      });
    } catch (err) {
      console.warn("[AlwaysListening] Mic access failed:", err);
      setState((s) => ({ ...s, stage: "error" }));
    }
  }, [processTranscript]);

  const stopWhisperListening = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;

    vadRef.current?.destroy();
    vadRef.current = null;

    recorderRef.current = null;

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
  }, []);

  // ─── Audio level metering for native mode ─────────────────────────
  const startNativeAudioMeter = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!enabledRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length / 255;
        setState((s) => ({ ...s, audioLevel: avg }));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();

      // Store ctx ref for cleanup
      (micStreamRef.current as any).__audioCtx = ctx;
    } catch {
      // Mic unavailable
    }
  }, []);

  const stopNativeAudioMeter = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;
    if (micStreamRef.current) {
      const ctx = (micStreamRef.current as any).__audioCtx;
      if (ctx) ctx.close().catch(() => {});
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
  }, []);

  // ─── Manual trigger (text input / suggested queries) ──────────────
  const manualTrigger = useCallback((text: string) => {
    if (!text.trim()) return;
    busyRef.current = true;
    setState((s) => ({
      ...s,
      stage: "inferring",
      transcript: text,
      wakeWordDetected: true,
    }));

    onQueryReadyRef.current(text);

    setTimeout(() => {
      setState((s) => ({
        ...s,
        stage: "idle",
        transcript: "",
        partialTranscript: "",
        liveTranscription: "",
        audioLevel: 0,
        wakeWordDetected: false,
      }));
      busyRef.current = false;
    }, 800);
  }, []);

  // ─── Cleanup ────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    stopNativeRecognition();
    stopNativeAudioMeter();
    stopWhisperListening();
    busyRef.current = false;
  }, [stopNativeRecognition, stopNativeAudioMeter, stopWhisperListening]);

  // ─── Enable / Disable ──────────────────────────────────────────
  const enable = useCallback(() => {
    enabledRef.current = true;
    setState((s) => ({ ...s, enabled: true, stage: "idle" }));

    if (sttMode === "native") {
      startNativeRecognition();
      startNativeAudioMeter();
    } else if (sttMode === "whisper") {
      startWhisperListening();
    }
  }, [
    sttMode,
    startNativeRecognition,
    startNativeAudioMeter,
    startWhisperListening,
  ]);

  const disable = useCallback(() => {
    enabledRef.current = false;
    cleanup();
    setState((s) => ({
      ...s,
      enabled: false,
      stage: "idle",
      audioLevel: 0,
      liveTranscription: "",
      wakeWordDetected: false,
    }));
  }, [cleanup]);

  useEffect(() => {
    enabledRef.current = enabledProp;
    setState((s) => ({ ...s, enabled: enabledProp }));
    if (!enabledProp) {
      cleanup();
      setState((s) => ({
        ...s,
        stage: "idle",
        audioLevel: 0,
        liveTranscription: "",
        wakeWordDetected: false,
      }));
    }
  }, [enabledProp, cleanup]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    state,
    enable,
    disable,
    manualTrigger,
    toggleTranscription,
  };
}
