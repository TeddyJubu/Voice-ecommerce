// ════════════════════════════════════════════════════════════════════════════
//  Voice Assistant — API Configuration
// ════════════════════════════════════════════════════════════════════════════

function env(key: string, fallback: string): string {
  const val = (import.meta.env as Record<string, string>)[key];
  return val && val.trim() !== "" ? val : fallback;
}

// ─── Tier 3 · LLM Providers ──────────────────────────────────────────────────
// Fallback chain: Cerebras (primary, ~90% available) → Nebius (secondary)
// Grok removed — no API key provided.

/** Cerebras — primary LLM (GPT-OSS 120B, ~2 100 tok/s, $0.003/req) */
export const CEREBRAS = {
  apiKey:   env("VITE_CEREBRAS_API_KEY",  ""),
  baseUrl:  env("VITE_CEREBRAS_BASE_URL", "https://api.cerebras.ai/v1"),
  model:    env("VITE_CEREBRAS_MODEL",    "gpt-oss-120b"),
} as const;

/**
 * Nebius Token Factory — fallback LLM (OpenAI-compatible, wafer-scale infra)
 * Dashboard / model catalog: https://studio.nebius.com/models
 */
export const NEBIUS = {
  apiKey:  env("VITE_NEBIUS_API_KEY", ""),
  baseUrl: env("VITE_NEBIUS_BASE_URL", "https://api.tokenfactory.nebius.com/v1/"),
  // Browse available models at https://studio.nebius.com/models
  model:   env("VITE_NEBIUS_MODEL", "Qwen/Qwen2.5-72B-Instruct-fast"),
} as const;

// ─── Tier 2 · Speech-to-Text & Text-to-Speech ────────────────────────────────

/** ElevenLabs — primary STT + TTS (FR-1 / FR-2) */
export const ELEVENLABS = {
  apiKey:      env("VITE_ELEVENLABS_API_KEY",   ""),
  sttWsUrl:    env("VITE_ELEVENLABS_STT_WS_URL", "wss://api.elevenlabs.io/v1/speech-to-text/stream"),
  ttsWsUrl:    env("VITE_ELEVENLABS_TTS_WS_URL", "wss://api.elevenlabs.io/v1/text-to-speech/stream"),
  voiceId:     env("VITE_ELEVENLABS_VOICE_ID",  "KpTQ5yzwazQWLkvnK59A"),
} as const;

/** Deepgram Nova-2 — alternative STT (real-time WebSocket) */
export const DEEPGRAM = {
  apiKey:  env("VITE_DEEPGRAM_API_KEY",    ""),
  wsUrl:   env("VITE_DEEPGRAM_STT_WS_URL", "wss://api.deepgram.com/v1/listen"),
} as const;

/** Groq Whisper Large v3 Turbo — alternative STT */
export const GROQ = {
  apiKey:  env("VITE_GROQ_API_KEY",       ""),
  baseUrl: env("VITE_GROQ_BASE_URL",      "https://api.groq.com/openai/v1"),
  model:   env("VITE_GROQ_WHISPER_MODEL", "whisper-large-v3-turbo"),
} as const;

/** Cerebras Whisper — STT using same Cerebras key */
export const CEREBRAS_WHISPER = {
  model: env("VITE_CEREBRAS_WHISPER_MODEL", "whisper-large-v3"),
} as const;

// ─── Tools · Search, News, Weather, Finance, Places ──────────────────────────
//
// All data-fetching that previously used Serper / NewsAPI / Bing News /
// AlphaVantage / CoinGecko / OpenWeather / Google Maps is now handled by
// Pollinations gemini-search (Google Gemini 2.5 Flash Lite + live web search).
// No extra API keys required.
//
// For images, Pollinations z-image-turbo is used.

/**
 * Pollinations.ai — free OpenAI-compatible API, no auth required.
 * Use model "openai" (GPT-4o mini) on the legacy free endpoint.
 * Docs: https://enter.pollinations.ai/api/docs
 */
export const POLLINATIONS = {
  textBaseUrl:  "https://text.pollinations.ai/openai",
  imageBaseUrl: "https://image.pollinations.ai",
  searchModel:  "openai",          // GPT-4o mini — always available, no key needed
  imageModel:   "z-image-turbo",
  apiKey:       "",                // intentionally blank — auth triggers deprecation
} as const;

// ─── Tools · Weather (free, no key needed) ───────────────────────────────────

/** Open-Meteo — free weather API, no key required */
export const OPEN_METEO = {
  baseUrl: env("VITE_OPEN_METEO_BASE_URL", "https://api.open-meteo.com/v1"),
} as const;

// ─── Pipeline Config ──────────────────────────────────────────────────────────

/** Which STT provider to activate: "elevenlabs" | "deepgram" | "groq" | "cerebras" */
export const STT_PROVIDER = env("VITE_STT_PROVIDER", "elevenlabs") as
  | "elevenlabs"
  | "deepgram"
  | "groq"
  | "cerebras";

/** Which LLM to use as primary: "cerebras" | "nebius" */
export const LLM_PRIMARY = env("VITE_LLM_PRIMARY", "cerebras") as
  | "cerebras"
  | "nebius";

/**
 * Cerebras availability threshold (0–1).
 * If a random check falls below this value the pipeline routes to Nebius.
 */
export const CEREBRAS_AVAILABILITY_THRESHOLD = parseFloat(
  env("VITE_CEREBRAS_AVAILABILITY_THRESHOLD", "0.9")
);

// ─── Cost model constants ($) ─────────────────────────────────────────────────
export const COST = {
  sttPerSecond:   parseFloat(env("VITE_STT_COST_PER_SECOND", "0.006")),
  gatePerCheck:   parseFloat(env("VITE_GATE_COST_PER_CHECK", "0.0002")),
  cerebrasPerReq: 0.003,
  nebiusPerReq:   0.004,
} as const;