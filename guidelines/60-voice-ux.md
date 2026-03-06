# File: guidelines/60-voice-ux.md

# Voice UX

## Assistant name & wake word

* The assistant is named **Friday**
* Wake word: "Friday" (case-insensitive)
* Always-listening mode only activates the pipeline when the wake word is detected
* Ambient speech without the wake word is silently ignored (zero LLM cost)
* The wake word is highlighted in violet (#8b5cf6) in the live transcription

## Recording behavior

* Mic button with pulsing ring when recording
* Real-time transcript appears immediately (native) or after recording (Whisper)
* One tap to start; tap or silence to stop
* Native SpeechRecognition: interim results stream in real-time
* Whisper fallback: shows "Recording..." then "Transcribing with Whisper..."

## Always-listening mode

* Toggled via ear icon button next to mic
* Green pulsing dot indicates active listening
* Pipeline: VAD → Wake word detection → STT → LLM
* "Friday activated!" stage shown in violet when wake word detected
* Pipeline stage strip shows real-time progress
* Session metrics: credits used/saved, wake word hit rate, utterance count
* See `95-always-listening-orchestration.md` for full architecture

## Live transcription

* Small inline display showing what Friday hears in real-time
* Can be toggled on/off via the chat bubble icon button next to the ear toggle
* Also configurable in Settings > Always Listening > Show live transcription
* Wake word "Friday" is highlighted in violet when detected
* Transcription clears after each utterance is processed or dismissed

## LLM routing

* Smart routing based on query type:
  * Live-data (news, weather, prices) → Pollinations search first
  * Knowledge (how-to, explanations) → Cerebras first
* Fallback chain: Cerebras → Groq → Nebius → Pollinations
* Streaming response via `queryLLMStream()` with SSE
* Summary text streams character-by-character in UI
* Provider badge shown on results

## Spoken response rules

* 1–2 sentences only
* The UI carries details; voice provides the headline
* Neutral tone, no fluff

## Fallbacks

* If mic permission denied: show a compact help card + "Use keyboard"
* If native SpeechRecognition unavailable: auto-fallback to Groq/Cerebras Whisper via MediaRecorder
* If Whisper also unavailable: text-only input with clear error messaging
* If no wake word detected: silently return to idle (no UI disruption)