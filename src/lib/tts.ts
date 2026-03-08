/**
 * tts.ts — ElevenLabs Text-to-Speech client
 *
 * Uses ElevenLabs REST API:
 *   POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}
 *
 * Gracefully skips if no API key is configured.
 */

import { ELEVENLABS } from "@/config/env";

// Module-level active Audio element so stopSpeaking() can pause it
let activeAudio: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;

/**
 * Speak the given text using ElevenLabs TTS.
 * Returns a Promise that resolves when audio finishes playing (or if skipped).
 */
export async function speakText(text: string, voiceId?: string): Promise<void> {
  if (!ELEVENLABS.apiKey) {
    // No API key — skip TTS gracefully
    return;
  }

  const resolvedVoiceId = voiceId || ELEVENLABS.voiceId;

  // Stop any currently playing audio first
  stopSpeaking();

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${resolvedVoiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS.apiKey,
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
      }
    );

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
      audio.onended = () => {
        cleanup();
        resolve();
      };
      audio.onerror = () => {
        cleanup();
        resolve();
      };
      audio.play().catch((err) => {
        console.warn("[TTS] Audio play failed:", err);
        cleanup();
        resolve();
      });
    });
  } catch (err) {
    console.warn("[TTS] speakText failed:", err);
  }
}

/**
 * Stop any currently playing TTS audio.
 */
export function stopSpeaking(): void {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.onended = null;
    activeAudio.onerror = null;
    activeAudio = null;
  }
  cleanup();
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
