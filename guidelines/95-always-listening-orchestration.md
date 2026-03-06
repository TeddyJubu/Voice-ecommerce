# Always-Listening Voice Orchestration

## Architecture Overview

The always-listening system uses a **wake-word-gated pipeline** that ensures the agent (named **Friday**) is perpetually listening but only burns API credits when the user says "Friday".

```
[Microphone] → T0: VAD → Wake Word ("Friday") → T2: STT → T3: LLM Router → [Response]
                 ↓ reject     ↓ no wake word
               (free)        (free — silently ignored)
```

## Dual STT Mode

The system auto-detects the best STT approach:

### Mode A: Native SpeechRecognition (Chrome, Edge)
- Uses `window.SpeechRecognition` or `webkitSpeechRecognition`
- Continuous listening with interim results
- Free, in-browser processing
- Wake word checked on final transcripts
- Audio level metering via separate `getUserMedia` + `AnalyserNode`

### Mode B: Groq/Cerebras Whisper Fallback (Firefox, Safari, etc.)
- Uses `getUserMedia` → `MediaRecorder` for audio capture
- Energy-based VAD via `AnalyserNode` (adaptive noise floor)
- On speech detection: record audio chunk
- On silence (1.5s): send chunk to Groq Whisper Large v3 Turbo
- Fallback chain: Groq Whisper → Cerebras Whisper
- Wake word checked on returned transcript

### Feature Detection (`/src/lib/stt.ts`)
- `hasNativeSpeechRecognition()` — checks for browser SpeechRecognition
- `hasGetUserMedia()` — checks for mic access API
- `hasMediaRecorder()` — checks for audio recording API
- Mode selection: native > whisper > none

## Tier Breakdown

### Tier 0 — Voice Activity Detection (VAD)
- **Where:** Browser (Web Audio API)
- **Cost:** $0.00 (completely local)
- **What it does:**
  - Runs `AnalyserNode` on microphone stream
  - Computes RMS energy from frequency data
  - Adaptive noise floor with slow decay (`floor = floor * 0.995 + rms * 0.005`)
  - Speech onset: energy > `noiseFloor * 3.0 + 0.015`
  - Speech offset: 1.5s sustained silence after speech

### Tier 1 — Wake Word Detection
- **Where:** Browser-side string matching on transcription
- **Cost:** $0.00 (completely local)
- **What it does:**
  - Checks if transcribed speech contains "Friday" (case-insensitive)
  - If wake word found → extract command, route to LLM
  - If no wake word → silently return to idle

### Tier 2 — Speech-to-Text (STT)
- **Where:** Browser (native) or API (Whisper fallback)
- **Cost:** Free (native) or ~$0.006/second (Whisper)
- **Providers:**
  - Primary: Browser SpeechRecognition (Chrome/Edge)
  - Fallback: Groq Whisper Large v3 Turbo → Cerebras Whisper Large v3

### Tier 3 — LLM Routing (Smart)
- **Where:** API
- **Smart routing:**
  - Live-data queries (news, weather, prices) → Pollinations search FIRST
  - Knowledge queries → Cerebras GPT-OSS 120B FIRST
- **Fallback chain:**
  - Cerebras → Groq Llama 3.3 70B → Nebius Qwen2.5-72B → Pollinations
- **Streaming:** SSE streaming via `queryLLMStream()`

## Cost Analysis

### Per-utterance cost comparison

| Strategy | Cost per utterance | Monthly (1000 utterances) |
|---|---|---|
| Naive always-on (STT + LLM every sound) | ~$0.027 | ~$27.00 |
| With VAD only (Tier 0) | ~$0.009 | ~$9.00 |
| **Full pipeline (native STT)** | **~$0.003 avg** | **~$3.00** |
| **Full pipeline (Whisper STT)** | **~$0.009 avg** | **~$9.00** |

## UX States

### Pipeline Stage Indicators
- **idle** (green pulse): VAD listening, waiting for "Friday"
- **hearing** (blue): VAD detected energy, streaming live transcription
- **wake-detected** (violet): "Friday" heard — activating pipeline
- **transcribing** (purple): STT processing (Whisper mode shows "GROQ WHISPER" badge)
- **routing** (orange): Choosing LLM provider
- **inferring** (primary): LLM generating
- **complete** (green flash): Response ready
- **error** (red): Mic denied or STT failed

### STT Mode Badge
- Shown when always-listening is enabled
- Green: "Web Speech API" (native)
- Purple: "Groq/Cerebras Whisper" (fallback)
- Red: "No STT available"

### Live Transcription
- Shows what Friday hears in real-time (toggleable)
- Wake word "Friday" highlighted in violet
- Ambient speech shown briefly then fades

### Streaming Summary
- LLM response summary streams character-by-character
- Typing cursor animation during streaming

### Dynamic Suggestions
- Suggested queries mix recent history (max 2) with shuffled defaults
- Refreshed when history changes

## Implementation Files

- `stt.ts` — STT service: Groq/Cerebras Whisper, VAD, MediaRecorder helpers, feature detection
- `llm.ts` — Smart-routed LLM with streaming (`queryLLMStream`) and live-data detection
- `useAlwaysListening.ts` — Core hook: dual-mode STT (native + Whisper), VAD, wake word
- `AlwaysListeningIndicator.tsx` — Visual pipeline with STT mode badge
- `VoiceInput.tsx` — Manual mic with native + Whisper fallback
- `HomePage.tsx` — Streaming query handler, dynamic suggestions
- `SettingsPage.tsx` — STT provider status, LLM routing config
- `mockScenarios.ts` — Types + dynamic `getSuggestedQueries()`
