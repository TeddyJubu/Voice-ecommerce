# Voice-ecommerce Implementation Plan

## Project Overview

Voice-powered e-commerce search assistant built with React 18 + TypeScript + Vite + TailwindCSS.
The core voice pipeline (VAD → Wake Word → STT → LLM → Dynamic UI Cards) is production-ready.
This plan addresses the remaining gaps.

---

## Change 1: Implement Text-to-Speech (TTS) via ElevenLabs

**Priority:** HIGH — biggest missing feature. The speaker icon toggle in the UI does nothing.

### What exists today
- `src/config/env.ts` exports `ELEVENLABS` with `apiKey`, `ttsWsUrl` (WebSocket), and `voiceId`
- `src/app/components/HomePage.tsx:26` has `isSpeaking` state and a speaker toggle button (lines 355-368)
- Lines 96-97 auto-set `isSpeaking` to true after summary streams, then false after 4s — purely visual
- `SettingsPage.tsx:6-7` has `selectedVoice` and `autoSpeak` state — UI only, not persisted or wired

### What to build

#### 1a. Create `src/lib/tts.ts` — ElevenLabs TTS client

Create a new file with:

```typescript
// Exports needed:
// - speakText(text: string, voiceId: string): Promise<void>
//   Uses ElevenLabs REST API (not WebSocket for simplicity):
//   POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}
//   Headers: { "xi-api-key": ELEVENLABS.apiKey, "Content-Type": "application/json" }
//   Body: { text, model_id: "eleven_turbo_v2_5", voice_settings: { stability: 0.5, similarity_boost: 0.75 } }
//   Response is audio/mpeg binary — create a Blob, then URL.createObjectURL, then play via new Audio()
//
// - stopSpeaking(): void
//   Pause and cleanup any active Audio element
//
// - isSpeakingNow(): boolean
//   Returns whether audio is currently playing
```

**Key implementation details:**
- Use the REST endpoint (simpler than WebSocket streaming)
- The `ELEVENLABS.apiKey` from env.ts may be empty — check and skip TTS gracefully if no key
- Use `eleven_turbo_v2_5` model for low latency
- Return a Promise that resolves when audio finishes playing
- Store the active `Audio` object in a module-level variable so `stopSpeaking()` can pause it
- Add an `onend` event listener on the Audio element to know when playback finishes

#### 1b. Integrate TTS into `src/app/components/HomePage.tsx`

Modify `HomePage.tsx`:

1. Import `speakText`, `stopSpeaking` from `../../lib/tts`
2. After the summary streaming completes (line 93-101, where `clearInterval` fires), call:
   ```typescript
   // Read autoSpeak preference from localStorage
   const autoSpeak = localStorage.getItem("voice-autoSpeak") !== "false";
   if (autoSpeak && summary) {
     setIsSpeaking(true);
     speakText(summary, localStorage.getItem("voice-selectedVoice") || ELEVENLABS.voiceId)
       .finally(() => setIsSpeaking(false));
   }
   ```
3. Remove the fake `setTimeout(() => setIsSpeaking(true/false))` on lines 96-97
4. Update `toggleSpeaking` (line 139-141) to actually call `stopSpeaking()` when turning off, or `speakText()` when turning on:
   ```typescript
   const toggleSpeaking = () => {
     if (isSpeaking) {
       stopSpeaking();
       setIsSpeaking(false);
     } else if (currentScenario?.summary) {
       setIsSpeaking(true);
       speakText(currentScenario.summary, localStorage.getItem("voice-selectedVoice") || ELEVENLABS.voiceId)
         .finally(() => setIsSpeaking(false));
     }
   };
   ```

#### 1c. Wire Settings to persist voice preferences

Modify `src/app/components/SettingsPage.tsx`:

1. Initialize `selectedVoice` from localStorage:
   ```typescript
   const [selectedVoice, setSelectedVoice] = useState(() =>
     localStorage.getItem("voice-selectedVoice") || "alloy"
   );
   ```
2. Persist on change — add a `useEffect`:
   ```typescript
   useEffect(() => {
     localStorage.setItem("voice-selectedVoice", selectedVoice);
   }, [selectedVoice]);
   ```
3. Do the same for `autoSpeak`:
   ```typescript
   const [autoSpeak, setAutoSpeak] = useState(() =>
     localStorage.getItem("voice-autoSpeak") !== "false"
   );
   useEffect(() => {
     localStorage.setItem("voice-autoSpeak", String(autoSpeak));
   }, [autoSpeak]);
   ```

**Note on voice IDs:** The settings page lists voices as "alloy", "echo", "fable", "nova", "shimmer" — these are OpenAI voice names. For ElevenLabs, map them to ElevenLabs voice IDs or use the default `ELEVENLABS.voiceId` for all. Alternatively, update the voice list to use real ElevenLabs voice IDs. The simplest approach: keep the default `ELEVENLABS.voiceId` and treat the voice selector as a future enhancement.

### Files to create
- `src/lib/tts.ts`

### Files to modify
- `src/app/components/HomePage.tsx` (lines 26, 93-101, 139-141)
- `src/app/components/SettingsPage.tsx` (lines 6-8, add useEffect imports)

---

## Change 2: Wire LLM Routing Preference from Settings

**Priority:** MEDIUM — Settings UI exists but has no effect.

### What exists today
- `SettingsPage.tsx:10` has `preferredLLM` state (`"cerebras" | "nebius"`) — not persisted
- `src/lib/llm.ts` hardcodes the provider order in `queryLLMStream()` (lines 560-575) — always Cerebras first for knowledge queries

### What to build

#### 2a. Persist LLM preference in Settings

In `src/app/components/SettingsPage.tsx`:
1. Initialize from localStorage:
   ```typescript
   const [preferredLLM, setPreferredLLM] = useState<"cerebras" | "nebius">(() =>
     (localStorage.getItem("voice-preferredLLM") as "cerebras" | "nebius") || "cerebras"
   );
   ```
2. Add useEffect to persist:
   ```typescript
   useEffect(() => {
     localStorage.setItem("voice-preferredLLM", preferredLLM);
   }, [preferredLLM]);
   ```

#### 2b. Read preference in LLM routing

In `src/lib/llm.ts`, modify `queryLLMStream()` (line 550) and `queryLLM()` (line 473):

1. Add an optional `preferredProvider` parameter:
   ```typescript
   export async function queryLLMStream(
     query: string,
     onChunk: (chunk: string) => void,
     preferredProvider?: "cerebras" | "nebius"
   ): Promise<LLMResult> {
   ```

2. When building the non-live provider order (lines 570-575), if `preferredProvider === "nebius"`, put Nebius first:
   ```typescript
   const knowledgeOrder = preferredProvider === "nebius"
     ? [
         { name: "nebius", call: (cb) => nebiusStream(messages, cb) },
         { name: "cerebras", call: (cb) => cerebrasStream(messages, cb) },
         { name: "groq", call: (cb) => groqStream(messages, cb) },
         { name: "pollinations", call: (cb) => pollinationsStream(messages, cb) },
       ]
     : [
         { name: "cerebras", call: (cb) => cerebrasStream(messages, cb) },
         { name: "groq", call: (cb) => groqStream(messages, cb) },
         { name: "nebius", call: (cb) => nebiusStream(messages, cb) },
         { name: "pollinations", call: (cb) => pollinationsStream(messages, cb) },
       ];
   ```
   Apply the same logic to `nonStreamOrder` and to `queryLLM()`.

#### 2c. Pass preference from HomePage

In `src/app/components/HomePage.tsx`, read the preference and pass it:
```typescript
const handleQuery = useCallback(async (text: string) => {
  // ...existing code...
  const preferredLLM = localStorage.getItem("voice-preferredLLM") as "cerebras" | "nebius" | null;
  const { scenario, provider } = await queryLLMStream(text, onChunk, preferredLLM || undefined);
  // ...rest...
}, []);
```

### Files to modify
- `src/lib/llm.ts` (functions `queryLLM` and `queryLLMStream` — add parameter, adjust order)
- `src/app/components/SettingsPage.tsx` (persist preferredLLM)
- `src/app/components/HomePage.tsx` (pass preference to queryLLMStream)

---

## Change 3: Create `.env.example` Template

**Priority:** MEDIUM — devs have no reference for required env vars.

### What to build

Create `.env.example` in the project root:

```bash
# ─── LLM Providers ──────────────────────────────────
VITE_CEREBRAS_API_KEY=
VITE_CEREBRAS_BASE_URL=https://api.cerebras.ai/v1
VITE_CEREBRAS_MODEL=gpt-oss-120b

VITE_NEBIUS_API_KEY=
VITE_NEBIUS_BASE_URL=https://api.tokenfactory.nebius.com/v1/
VITE_NEBIUS_MODEL=Qwen/Qwen2.5-72B-Instruct-fast

# ─── Speech-to-Text ─────────────────────────────────
VITE_GROQ_API_KEY=
VITE_GROQ_BASE_URL=https://api.groq.com/openai/v1
VITE_GROQ_WHISPER_MODEL=whisper-large-v3-turbo

# ─── Text-to-Speech (ElevenLabs) ────────────────────
VITE_ELEVENLABS_API_KEY=
VITE_ELEVENLABS_VOICE_ID=KpTQ5yzwazQWLkvnK59A

# ─── Optional ────────────────────────────────────────
VITE_DEEPGRAM_API_KEY=
VITE_STT_PROVIDER=elevenlabs
VITE_LLM_PRIMARY=cerebras
VITE_CEREBRAS_AVAILABILITY_THRESHOLD=0.9
```

Also add `.env.local` to `.gitignore` if not already present.

### Files to create
- `.env.example`

### Files to modify
- `.gitignore` (verify `.env.local` and `.env` are listed)

---

## Change 4: Integrate Pollinations Image Generation into Product Cards

**Priority:** LOW — nice enhancement but not critical.

### What exists today
- `src/lib/pollinations.ts` exports `pollinationsImageUrl(prompt, options)` — fully implemented, returns a URL string
- `src/app/components/cards/ProductShowcase.tsx` renders product cards but uses no images
- The LLM system prompt in `src/lib/llm.ts:59` defines ProductShowcase schema — no image field

### What to build

#### 4a. Add image field to ProductShowcase schema in LLM prompt

In `src/lib/llm.ts`, update the ProductShowcase section of `SYSTEM_PROMPT` (around line 58-59):

Change:
```
{"type":"ProductShowcase","props":{"query":"keywords","products":[{"title":"Product name","price":"$49","rating":4.5,"link":"https://amazon.com","source":"Amazon"}]}}
```
To:
```
{"type":"ProductShowcase","props":{"query":"keywords","products":[{"title":"Product name","price":"$49","rating":4.5,"link":"https://amazon.com","source":"Amazon","imagePrompt":"short description for AI image generation"}]}}
```

#### 4b. Use Pollinations image URL in ProductShowcase component

In `src/app/components/cards/ProductShowcase.tsx`:

1. Import `pollinationsImageUrl` from `../../lib/pollinations`
2. For each product, if `product.imagePrompt` exists, generate an image URL:
   ```typescript
   const imageUrl = product.imagePrompt
     ? pollinationsImageUrl(product.imagePrompt, { width: 200, height: 200 })
     : null;
   ```
3. Render the image in the product card with a fallback placeholder

**Note:** Pollinations images are generated on-the-fly via GET URL — no fetch needed. The `<img>` tag loads it directly. Add `loading="lazy"` for performance.

### Files to modify
- `src/lib/llm.ts` (SYSTEM_PROMPT, line ~58-59)
- `src/app/components/cards/ProductShowcase.tsx` (add image rendering)

---

## Execution Order

1. **Change 3** (.env.example) — 2 minutes, standalone
2. **Change 2** (LLM routing preference) — 15 minutes, self-contained
3. **Change 1** (TTS implementation) — 30 minutes, most impactful
4. **Change 4** (Product images) — 15 minutes, enhancement

## Testing Checklist

After implementing each change, verify:

- [ ] `npm run build` succeeds with no TypeScript errors
- [ ] `npm run dev` starts the dev server

### Change 1 (TTS)
- [ ] With a valid `VITE_ELEVENLABS_API_KEY` in `.env.local`, submitting a query plays audio of the summary
- [ ] The speaker icon toggles between Volume2/VolumeX and actually starts/stops audio
- [ ] With `autoSpeak` off in Settings, audio does NOT auto-play
- [ ] With no API key, the app still works — TTS silently skips

### Change 2 (LLM Routing)
- [ ] Selecting "Nebius" in Settings persists across page reload
- [ ] After selecting Nebius, queries show the Nebius provider badge (when Cerebras would have been used)

### Change 3 (.env.example)
- [ ] `.env.example` exists and lists all required variables
- [ ] `.env.local` is in `.gitignore`

### Change 4 (Product Images)
- [ ] Shopping queries ("best earbuds") render product cards with AI-generated images
- [ ] Images load lazily and have fallback styling if they fail

## Architecture Notes

- **State management:** React hooks + localStorage only. No Redux/Zustand.
- **Styling:** TailwindCSS utility classes. No CSS modules or styled-components.
- **API pattern:** All external calls go through thin wrappers in `src/lib/`. Components never call APIs directly.
- **Error handling:** Graceful fallback chains. Never crash the app on a single provider failure.
- **Imports:** Use `@/` path alias (configured in vite.config.ts) for imports from `src/`.
