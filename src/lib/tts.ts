/**
 * tts.ts — ElevenLabs Text-to-Speech client
 *
 * Requests are proxied through /api/tts/:voiceId so the ElevenLabs API key
 * is never bundled into the client. Configure the Vite dev-server proxy in
 * vite.config.ts; for production deploy a server-side route that adds the
 * xi-api-key header before forwarding to ElevenLabs.
 */

import { ELEVENLABS } from "@/config/env";

// Module-level active Audio element so stopSpeaking() can pause it
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

  // Stop any currently playing audio first (also resolves the old Promise)
  stopSpeaking();

  try {
    const res = await fetch(`/api/tts/${resolvedVoiceId}`, {
      method: "POST",
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
    console.warn("[TTS] speakText failed:", err);
  }
}

/**
 * Stop any currently playing TTS audio and resolve the pending Promise so
 * callers awaiting speakText() are not left hanging.
 */
export function stopSpeaking(): void {
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
