/**
 * stt.ts — Speech-to-Text service
 *
 * Fallback STT provider using Groq Whisper Large v3 Turbo.
 * Used when the browser doesn't support native SpeechRecognition
 * (i.e. Firefox, Safari, or sandbox environments).
 *
 * Pipeline:
 *   1. getUserMedia → MediaRecorder (webm/opus or wav)
 *   2. VAD via AnalyserNode (energy-based speech detection)
 *   3. On speech end → send audio blob to Groq Whisper
 *   4. Return transcript text
 */

import { GROQ, CEREBRAS, CEREBRAS_WHISPER } from "@/config/env";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TranscriptionResult {
  text: string;
  provider: "groq-whisper" | "cerebras-whisper";
  durationMs: number;
}

// ─── Groq Whisper transcription ─────────────────────────────────────────────

export async function groqTranscribe(
  audioBlob: Blob,
  language = "en"
): Promise<TranscriptionResult> {
  const start = performance.now();
  const form = new FormData();
  form.append("file", audioBlob, "audio.webm");
  form.append("model", GROQ.model); // whisper-large-v3-turbo
  form.append("language", language);
  form.append("response_format", "json");

  const res = await fetch(`${GROQ.baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ.apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Groq Whisper error ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  return {
    text: (json.text ?? "").trim(),
    provider: "groq-whisper",
    durationMs: Math.round(performance.now() - start),
  };
}

// ─── Cerebras Whisper transcription ─────────────────────────────────────────

export async function cerebrasTranscribe(
  audioBlob: Blob,
  language = "en"
): Promise<TranscriptionResult> {
  const start = performance.now();
  const form = new FormData();
  form.append("file", audioBlob, "audio.webm");
  form.append("model", CEREBRAS_WHISPER.model); // whisper-large-v3
  form.append("language", language);
  form.append("response_format", "json");

  const res = await fetch(`${CEREBRAS.baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${CEREBRAS.apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Cerebras Whisper error ${res.status}: ${body.slice(0, 200)}`
    );
  }

  const json = await res.json();
  return {
    text: (json.text ?? "").trim(),
    provider: "cerebras-whisper",
    durationMs: Math.round(performance.now() - start),
  };
}

// ─── Fallback chain: Groq → Cerebras ────────────────────────────────────────

export async function transcribeAudio(
  audioBlob: Blob,
  language = "en"
): Promise<TranscriptionResult> {
  // Try Groq first (faster turbo model), then Cerebras
  try {
    return await groqTranscribe(audioBlob, language);
  } catch (err) {
    console.warn("[STT] Groq Whisper failed:", err);
  }

  try {
    return await cerebrasTranscribe(audioBlob, language);
  } catch (err) {
    console.warn("[STT] Cerebras Whisper failed:", err);
  }

  throw new Error("All STT providers failed");
}

// ─── MediaRecorder helpers ──────────────────────────────────────────────────

/** Supported MIME type for MediaRecorder */
export function getRecordingMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "audio/webm"; // fallback
}

/**
 * Record audio from a MediaStream until stopped.
 * Returns a promise that resolves with the audio Blob.
 */
export function createRecorder(stream: MediaStream): {
  start: () => void;
  stop: () => Promise<Blob>;
  isRecording: () => boolean;
} {
  const mimeType = getRecordingMimeType();
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];
  let resolveBlob: ((blob: Blob) => void) | null = null;

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: mimeType });
    chunks.length = 0;
    resolveBlob?.(blob);
  };

  return {
    start: () => {
      chunks.length = 0;
      recorder.start(100); // 100ms timeslice for smoother recording
    },
    stop: () =>
      new Promise<Blob>((resolve) => {
        resolveBlob = resolve;
        if (recorder.state === "recording") {
          recorder.stop();
        } else {
          resolve(new Blob([], { type: mimeType }));
        }
      }),
    isRecording: () => recorder.state === "recording",
  };
}

// ─── Energy-based VAD ───────────────────────────────────────────────────────

export interface VADConfig {
  /** Speech onset multiplier over noise floor (default: 3.0) */
  onsetMultiplier?: number;
  /** Minimum energy to consider as speech (default: 0.015) */
  minOnsetEnergy?: number;
  /** Silence duration in ms to trigger speech end (default: 1500) */
  silenceTimeoutMs?: number;
  /** Noise floor decay rate (default: 0.995) */
  noiseFloorDecay?: number;
}

export interface VADHandle {
  /** Current audio energy level (0-1) */
  getEnergy: () => number;
  /** Whether speech is currently detected */
  isSpeaking: () => boolean;
  /** Stop the VAD */
  destroy: () => void;
  /** Register speech start/end callbacks */
  onSpeechStart: (cb: () => void) => void;
  onSpeechEnd: (cb: () => void) => void;
}

/**
 * Create an energy-based Voice Activity Detector from a mic stream.
 * Uses AnalyserNode for real-time frequency analysis.
 */
export function createVAD(
  stream: MediaStream,
  config: VADConfig = {}
): VADHandle {
  const {
    onsetMultiplier = 3.0,
    minOnsetEnergy = 0.015,
    silenceTimeoutMs = 1500,
    noiseFloorDecay = 0.995,
  } = config;

  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);

  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  let noiseFloor = 0.05;
  let energy = 0;
  let speaking = false;
  let silenceStart = 0;
  let animFrame: number | null = null;

  let speechStartCb: (() => void) | null = null;
  let speechEndCb: (() => void) | null = null;

  const tick = () => {
    analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
    energy = sum / dataArray.length / 255;

    // Adapt noise floor
    if (!speaking) {
      noiseFloor = noiseFloor * noiseFloorDecay + energy * (1 - noiseFloorDecay);
    }

    const threshold = noiseFloor * onsetMultiplier + minOnsetEnergy;

    if (!speaking && energy > threshold) {
      speaking = true;
      silenceStart = 0;
      speechStartCb?.();
    } else if (speaking && energy < threshold) {
      if (silenceStart === 0) {
        silenceStart = performance.now();
      } else if (performance.now() - silenceStart > silenceTimeoutMs) {
        speaking = false;
        silenceStart = 0;
        speechEndCb?.();
      }
    } else if (speaking && energy >= threshold) {
      silenceStart = 0;
    }

    animFrame = requestAnimationFrame(tick);
  };

  tick();

  return {
    getEnergy: () => energy,
    isSpeaking: () => speaking,
    destroy: () => {
      if (animFrame) cancelAnimationFrame(animFrame);
      ctx.close().catch(() => {});
    },
    onSpeechStart: (cb) => { speechStartCb = cb; },
    onSpeechEnd: (cb) => { speechEndCb = cb; },
  };
}

// ─── Feature detection ──────────────────────────────────────────────────────

export function hasNativeSpeechRecognition(): boolean {
  return !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

export function hasMediaRecorder(): boolean {
  return typeof MediaRecorder !== "undefined";
}

export function hasGetUserMedia(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}
