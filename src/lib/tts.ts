/**
 * tts.ts — ElevenLabs Text-to-Speech client
 *
 * Requests are proxied through /api/tts/:voiceId so the ElevenLabs API key
 * is never bundled into the client. Configure the Vite dev-server proxy in
 * vite.config.ts; for production deploy a server-side route that adds the
 * xi-api-key header before forwarding to ElevenLabs.
 */

import { ELEVENLABS } from "@/config/env";

/** ElevenLabs pre-made voices available in Settings. */
export const ELEVENLABS_VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel",  description: "Neutral, balanced" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh",    description: "Warm, conversational" },
  { id: "ThT5KcBeYPX3keUQqHPh", name: "Dorothy", description: "Expressive, storytelling" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella",   description: "Bright, energetic" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli",    description: "Calm, soothing" },
] as const

const VALID_VOICE_IDS = new Set(ELEVENLABS_VOICES.map((v) => v.id))
const DEFAULT_VOICE_ID = ELEVENLABS_VOICES[0].id // Rachel

/**
 * Read `voice-selectedVoice` from localStorage and validate it against the
 * known ElevenLabs voice ID list.  Falls back to the default (Rachel) when
 * the stored value is missing or a legacy name such as "alloy".
 * Also writes the corrected value back so future reads are clean.
 */
export function resolveStoredVoiceId(): string {
  const stored = localStorage.getItem("voice-selectedVoice") ?? ""
  const valid  = VALID_VOICE_IDS.has(stored) ? stored : DEFAULT_VOICE_ID
  if (valid !== stored) localStorage.setItem("voice-selectedVoice", valid)
  return valid
}

// Module-level state so stopSpeaking() can cancel both fetch and playback
let activeController: AbortController | null = null;
let activeAudio: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;
// Resolve callback for the currently pending speakText() Promise
let resolveActive: (() => void) | null = null;

/**
 * Speak the given text using ElevenLabs TTS (via /api/tts proxy).
 * Returns a Promise that resolves when audio finishes playing, is stopped,
 * or if the request fails.
 */
export async function speakText(text: string, voiceId?: string): Promise<void> {
  const resolvedVoiceId = voiceId || ELEVENLABS.voiceId;

  // Cancel any in-flight request and pending playback before starting a new one
  stopSpeaking();

  const controller = new AbortController();
  activeController = controller;

  try {
    const res = await fetch(`/api/tts/${resolvedVoiceId}`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`[TTS] ElevenLabs error ${res.status}: ${body.slice(0, 200)}`);
      return;
    }

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    activeObjectUrl = objectUrl;

    const audio = new Audio(objectUrl);
    activeAudio = audio;

    await new Promise<void>((resolve) => {
      resolveActive = resolve;
      audio.onended = () => {
        resolveActive = null;
        cleanup();
        resolve();
      };
      audio.onerror = () => {
        resolveActive = null;
        cleanup();
        resolve();
      };
      audio.play().catch((err) => {
        console.warn("[TTS] Audio play failed:", err);
        resolveActive = null;
        cleanup();
        resolve();
      });
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return; // stopSpeaking() called
    console.warn("[TTS] speakText failed:", err);
  }
}

/**
 * Stop any currently playing TTS audio and resolve the pending Promise so
 * callers awaiting speakText() are not left hanging.
 */
export function stopSpeaking(): void {
  // Abort any in-flight fetch first so audio never starts from a stale request
  if (activeController) {
    activeController.abort();
    activeController = null;
  }
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.onended = null;
    activeAudio.onerror = null;
    activeAudio = null;
  }
  cleanup();
  const res = resolveActive;
  resolveActive = null;
  res?.();
}

/**
 * Returns whether TTS audio is currently playing.
 */
export function isSpeakingNow(): boolean {
  return activeAudio !== null && !activeAudio.paused;
}

function cleanup(): void {
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = null;
  }
}
