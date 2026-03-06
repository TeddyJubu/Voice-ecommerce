/**
 * pollinations.ts
 * ───────────────
 * Thin wrappers around the Pollinations.ai API.
 *
 * Text / Search  → OpenAI-compatible  POST https://text.pollinations.ai/openai
 *   model: "gemini-search"  (Google Gemini 2.5 Flash Lite + live web search)
 *
 * Image          → GET  https://image.pollinations.ai/prompt/{prompt}
 *   model: "z-image-turbo"
 *
 * No API key required for either endpoint.
 * Docs: https://enter.pollinations.ai/api/docs
 */

import { POLLINATIONS } from "@/config/env";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface SearchResult {
  /** Full assistant reply text */
  text: string;
  /** Raw choice object from the API */
  raw: unknown;
}

export interface ImageOptions {
  width?: number;
  height?: number;
  seed?: number;
  /** Defaults to POLLINATIONS.imageModel ("z-image-turbo") */
  model?: string;
  nologo?: boolean;
  enhance?: boolean;
}

// ─── Text / Search ───────────────────────────────────────────────────────────

/**
 * Send a chat/search request to Pollinations using the gemini-search model.
 *
 * @example
 * const result = await pollinationsSearch("Best noise-cancelling earbuds under $100");
 * console.log(result.text);
 */
export async function pollinationsSearch(
  query: string,
  options?: {
    systemPrompt?: string;
    messages?: ChatMessage[];
    model?: string;
    stream?: false;
  }
): Promise<SearchResult> {
  const messages: ChatMessage[] = options?.messages ?? [
    {
      role: "system",
      content:
        options?.systemPrompt ??
        "You are a helpful voice assistant. Answer concisely and factually. " +
          "Use live web search results where available. " +
          "Format your answer in plain prose — no markdown headers.",
    },
    { role: "user", content: query },
  ];

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (POLLINATIONS.apiKey) {
    headers["Authorization"] = `Bearer ${POLLINATIONS.apiKey}`;
  }

  const res = await fetch(`${POLLINATIONS.textBaseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: options?.model ?? POLLINATIONS.searchModel,
      messages,
      stream: false,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Pollinations text API error ${res.status}: ${body}`
    );
  }

  const json = await res.json();
  const text: string =
    json?.choices?.[0]?.message?.content ?? "";

  return { text, raw: json };
}

/**
 * Streaming variant — yields text chunks as they arrive.
 * Useful for live transcript-style rendering.
 *
 * @example
 * for await (const chunk of pollinationsSearchStream("AI news today")) {
 *   setAnswer(prev => prev + chunk);
 * }
 */
export async function* pollinationsSearchStream(
  query: string,
  options?: {
    systemPrompt?: string;
    messages?: ChatMessage[];
    model?: string;
  }
): AsyncGenerator<string> {
  const messages: ChatMessage[] = options?.messages ?? [
    {
      role: "system",
      content:
        options?.systemPrompt ??
        "You are a helpful voice assistant. Answer concisely and factually. " +
          "Use live web search results where available.",
    },
    { role: "user", content: query },
  ];

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (POLLINATIONS.apiKey) {
    headers["Authorization"] = `Bearer ${POLLINATIONS.apiKey}`;
  }

  const res = await fetch(`${POLLINATIONS.textBaseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: options?.model ?? POLLINATIONS.searchModel,
      messages,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    throw new Error(`Pollinations stream error ${res.status}: ${body}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "data: [DONE]") continue;
      if (!trimmed.startsWith("data:")) continue;

      try {
        const json = JSON.parse(trimmed.slice(5).trim());
        const delta: string = json?.choices?.[0]?.delta?.content ?? "";
        if (delta) yield delta;
      } catch {
        // malformed SSE line — skip
      }
    }
  }
}

// ─── Image Generation ────────────────────────────────────────────────────────

/**
 * Build a Pollinations image URL (GET-based, no fetch needed).
 * Drop the returned URL straight into an <img src={...} />.
 *
 * @example
 * const src = pollinationsImageUrl("futuristic city skyline at sunset", { width: 800 });
 * <img src={src} alt="Generated city" />
 */
export function pollinationsImageUrl(
  prompt: string,
  options: ImageOptions = {}
): string {
  const {
    width = 1024,
    height = 1024,
    seed,
    model = POLLINATIONS.imageModel,
    nologo = true,
    enhance = false,
  } = options;

  const params = new URLSearchParams({
    model,
    width: String(width),
    height: String(height),
    nologo: String(nologo),
    enhance: String(enhance),
  });

  if (seed !== undefined) params.set("seed", String(seed));

  const encodedPrompt = encodeURIComponent(prompt);
  return `${POLLINATIONS.imageBaseUrl}/prompt/${encodedPrompt}?${params.toString()}`;
}

/**
 * Fetch a Pollinations image as a Blob (useful when you need a local object URL
 * or want to confirm the image loaded before displaying it).
 */
export async function pollinationsImageBlob(
  prompt: string,
  options: ImageOptions = {}
): Promise<Blob> {
  const url = pollinationsImageUrl(prompt, options);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Pollinations image error ${res.status}`);
  }
  return res.blob();
}
