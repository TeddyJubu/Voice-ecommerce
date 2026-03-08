/**
 * llm.ts — Real LLM query engine with smart routing
 *
 * Smart routing:
 *   Live-data queries (news, weather, prices, current events)
 *       → Pollinations gemini-search FIRST  (real Google search)
 *       → Cerebras GPT-OSS 120B fallback
 *       → Groq llama-3.3-70b-versatile
 *       → Nebius Token Factory
 *
 *   Knowledge queries (how-to, explanations, shopping, etc.)
 *       → Cerebras GPT-OSS 120B FIRST  (fast, $0.003/req)
 *       → Groq llama-3.3-70b-versatile
 *       → Nebius Token Factory
 *       → Pollinations gemini-search (last resort)
 */

import { CEREBRAS, NEBIUS, GROQ, POLLINATIONS } from "@/config/env";
import type { Scenario, UIBlock } from "@/app/components/mockScenarios";

// ─── Live-data detection ──────────────────────────────────────────────────────

const LIVE_DATA_RE = [
  /\bnews\b|latest|breaking|headline|current event/i,
  /\bprice\b|cost|how much|\bstock\b|\bcrypto\b|bitcoin|ethereum|bnb|solana|doge/i,
  /\bweather\b|forecast|temperature|humidity|rain|snow|storm/i,
  /what.?s happening|what happened|who won|who is (leading|winning)/i,
  /today|tonight|right now|currently|as of|this (week|month|year)/i,
  /\b(2024|2025|2026)\b/i,
  /\btrending\b|viral|popular right now/i,
  /\bscore\b|game|match|result/i,
];

export function needsLiveData(query: string): boolean {
  return LIVE_DATA_RE.some((re) => re.test(query));
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a voice assistant UI engine. Return ONLY a raw JSON object — no markdown, no text outside the JSON.

JSON format:
{
  "summary": "1-2 sentence spoken answer, friendly and concise",
  "blocks": [ ...UI card objects... ]
}

AVAILABLE CARD TYPES (pick the most appropriate ones):

WeatherPanel
{"type":"WeatherPanel","props":{"location":"City","date":"Today, Mar 1","summary":"brief prose","currentTemp":"28°C","high":"31°C","low":"22°C","humidity":"65%","wind":"12 km/h","icon":"sun","hourly":[{"time":"9 AM","temp":"26°C","icon":"sun"}]}}
icon values: "sun" | "cloud" | "rain" | "snow"

NewsBrief
{"type":"NewsBrief","props":{"topic":"Topic","articles":[{"title":"Headline","source":"BBC","time":"1 hour ago","snippet":"Summary sentence.","url":"https://bbc.com/..."}]}}

ProductShowcase
{"type":"ProductShowcase","props":{"query":"keywords","products":[{"title":"Product name","price":"$49","rating":4.5,"link":"https://amazon.com","source":"Amazon","imagePrompt":"short description for AI image generation"}]}}

ComparisonTable (use alongside ProductShowcase when comparing 2+ items)
{"type":"ComparisonTable","props":{"headers":["Product","Price","Key Feature","Rating"],"rows":[["Name","$50","Good","4.5★"]],"highlightBest":0}}

HowToSteps
{"type":"HowToSteps","props":{"title":"How to ...","steps":[{"step":1,"title":"Step","description":"Detail."}],"source":"Source name"}}

StockCryptoQuote
{"type":"StockCryptoQuote","props":{"symbol":"BTC","name":"Bitcoin","price":"$87,000","change":"+$1,200","changePercent":"+1.4%","isPositive":true,"marketCap":"$1.7T","volume":"$38B","high24h":"$89,000","low24h":"$85,000"}}

MapPlacesList
{"type":"MapPlacesList","props":{"title":"Places","places":[{"name":"Name","address":"123 St","rating":4.5,"distance":"0.3 mi","type":"Japanese"}]}}

InfoCard
{"type":"InfoCard","props":{"title":"Topic","body":"Explanation paragraph."}}

WebResultsList
{"type":"WebResultsList","props":{"results":[{"title":"Page title","url":"https://...","snippet":"Brief excerpt.","source":"example.com"}]}}

ActionBar (ALWAYS include as the last block)
{"type":"ActionBar","props":{"actions":[{"label":"Follow-up label","query":"follow-up query"}]}}

RULES:
- weather → WeatherPanel + ActionBar
- news/latest → NewsBrief + ActionBar  (use REAL news from search, not made-up headlines)
- shopping/buy → ProductShowcase + ComparisonTable (if ≥2 items) + ActionBar
- how to/recipe → HowToSteps + ActionBar
- stock/crypto → StockCryptoQuote + ActionBar
- places/near me → MapPlacesList + ActionBar
- general/explain → InfoCard + WebResultsList + ActionBar
- Always end with ActionBar (2-3 follow-up suggestions)
- Return ONLY the JSON object.`;

// ─── HTTP call helper ─────────────────────────────────────────────────────────

interface ChatMsg {
  role: "system" | "user" | "assistant";
  content: string;
}

async function callOpenAI(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMsg[],
  timeoutMs = 12_000
): Promise<string> {
  const url = baseUrl.replace(/\/$/, "") + "/chat/completions";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.4,
        max_tokens: 2000,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
    }
    const json = await res.json();
    return json?.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timer);
  }
}

// ─── Streaming call helper ──────────────────────────────────────────────────

async function callOpenAIStream(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMsg[],
  onChunk: (text: string) => void,
  timeoutMs = 20_000
): Promise<string> {
  const url = baseUrl.replace(/\/$/, "") + "/chat/completions";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.4,
        max_tokens: 2000,
        stream: true,
      }),
    });

    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

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
          if (delta) {
            fullText += delta;
            onChunk(delta);
          }
        } catch {
          // malformed SSE line
        }
      }
    }

    return fullText;
  } finally {
    clearTimeout(timer);
  }
}

// ─── JSON extraction ──────────────────────────────────────────────────────────

export function extractJSON(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");

  const start = s.indexOf("{");
  if (start === -1) throw new Error("No JSON object in response");

  let depth = 0,
    inString = false,
    escape = false;

  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\" && inString) {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  throw new Error("Unterminated JSON object");
}

/**
 * Repair common JSON issues produced by LLMs:
 * - Trailing commas in arrays and objects
 * - Truncated arrays/objects (add closing brackets)
 * - Single-quoted strings → double-quoted
 * - Unescaped newlines in strings
 * - NaN/Infinity → null
 */
export function repairJSON(text: string): string {
  let s = text;

  // Fix trailing commas before ] or } (with optional whitespace)
  s = s.replace(/,\s*([\]}])/g, "$1");

  // Fix unescaped newlines inside strings
  // Match strings and replace literal newlines within them
  s = s.replace(/"(?:[^"\\]|\\.)*"/g, (match) => {
    return match.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");
  });

  // Replace NaN/Infinity with null
  s = s.replace(/:\s*NaN\b/g, ": null");
  s = s.replace(/:\s*Infinity\b/g, ": null");
  s = s.replace(/:\s*-Infinity\b/g, ": null");

  // Try to close any unclosed brackets/braces
  let openBraces = 0, openBrackets = 0;
  let inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (esc) { esc = false; continue; }
    if (c === "\\" && inStr) { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{") openBraces++;
    else if (c === "}") openBraces--;
    else if (c === "[") openBrackets++;
    else if (c === "]") openBrackets--;
  }

  // Close any unclosed structures
  // First, remove any trailing comma before we close
  s = s.replace(/,\s*$/, "");
  for (let i = 0; i < openBrackets; i++) s += "]";
  for (let i = 0; i < openBraces; i++) s += "}";

  return s;
}

export function parseScenario(raw: string, query: string): Scenario {
  if (!raw.trim()) throw new Error("Empty response");

  const text = extractJSON(raw);

  // Try direct parse first, then repaired parse
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (e1) {
    try {
      parsed = JSON.parse(repairJSON(text));
      console.info("[LLM] JSON repaired successfully");
    } catch (e2) {
      // Last resort: try to extract just the summary with regex
      const summaryMatch = text.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (summaryMatch) {
        console.warn("[LLM] JSON broken but extracted summary via regex");
        return {
          query,
          summary: summaryMatch[1].replace(/\\"/g, '"').replace(/\\n/g, " "),
          blocks: [
            {
              type: "InfoCard",
              props: {
                title: "Partial response",
                body: "The AI response had a formatting issue. Here's the summary we could extract.",
              },
            },
            {
              type: "ActionBar",
              props: {
                actions: [
                  { label: "Try again", query },
                  { label: "Rephrase question", query: `Tell me about: ${query}` },
                ],
              },
            },
          ],
        };
      }
      // Re-throw with context
      throw new Error(
        `JSON parse failed after repair: ${e2 instanceof Error ? e2.message : e2}`
      );
    }
  }

  const summary: string =
    typeof parsed.summary === "string"
      ? parsed.summary
      : typeof parsed.message === "string"
      ? parsed.message
      : typeof parsed.response === "string"
      ? parsed.response
      : typeof parsed.answer === "string"
      ? parsed.answer
      : "Here's what I found.";

  const blocks: UIBlock[] = Array.isArray(parsed.blocks)
    ? parsed.blocks
    : Array.isArray(parsed.cards)
    ? parsed.cards
    : Array.isArray(parsed.ui)
    ? parsed.ui
    : Array.isArray(parsed.results)
    ? parsed.results
    : [];

  return { query, summary, blocks };
}

// ─── Provider helpers ─────────────────────────────────────────────────────────

async function cerebras(messages: ChatMsg[]) {
  return callOpenAI(
    CEREBRAS.baseUrl,
    CEREBRAS.apiKey,
    CEREBRAS.model,
    messages
  );
}
async function groq(messages: ChatMsg[]) {
  return callOpenAI(
    GROQ.baseUrl,
    GROQ.apiKey,
    "llama-3.3-70b-versatile",
    messages
  );
}
async function nebius(messages: ChatMsg[]) {
  return callOpenAI(NEBIUS.baseUrl, NEBIUS.apiKey, NEBIUS.model, messages);
}
async function pollinationsCall(messages: ChatMsg[]) {
  return callOpenAI(
    POLLINATIONS.textBaseUrl,
    "",
    POLLINATIONS.searchModel,
    messages,
    20_000
  );
}

// Streaming variants
async function cerebrasStream(
  messages: ChatMsg[],
  onChunk: (text: string) => void
) {
  return callOpenAIStream(
    CEREBRAS.baseUrl,
    CEREBRAS.apiKey,
    CEREBRAS.model,
    messages,
    onChunk
  );
}
async function groqStream(
  messages: ChatMsg[],
  onChunk: (text: string) => void
) {
  return callOpenAIStream(
    GROQ.baseUrl,
    GROQ.apiKey,
    "llama-3.3-70b-versatile",
    messages,
    onChunk
  );
}
async function nebiusStream(
  messages: ChatMsg[],
  onChunk: (text: string) => void
) {
  return callOpenAIStream(
    NEBIUS.baseUrl,
    NEBIUS.apiKey,
    NEBIUS.model,
    messages,
    onChunk
  );
}
async function pollinationsStream(
  messages: ChatMsg[],
  onChunk: (text: string) => void
) {
  return callOpenAIStream(
    POLLINATIONS.textBaseUrl,
    "",
    POLLINATIONS.searchModel,
    messages,
    onChunk,
    25_000
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type LLMProviderName =
  | "cerebras"
  | "groq"
  | "nebius"
  | "pollinations"
  | "error";

export interface LLMResult {
  scenario: Scenario;
  provider: LLMProviderName;
}

/**
 * Smart-routed LLM query (non-streaming).
 *
 * Live-data queries → Pollinations (search) → Cerebras → Groq → Nebius
 * Knowledge queries → Cerebras → Groq → Nebius → Pollinations
 */
export async function queryLLM(
  query: string,
  preferredProvider?: "cerebras" | "nebius"
): Promise<LLMResult> {
  const isLive = needsLiveData(query);
  const messages: ChatMsg[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: query },
  ];

  // Build provider order based on query type and user preference
  const order: Array<{ name: LLMProviderName; call: () => Promise<string> }> =
    isLive
      ? [
          // Live data: search-capable provider first
          { name: "pollinations", call: () => pollinationsCall(messages) },
          { name: "cerebras", call: () => cerebras(messages) },
          { name: "groq", call: () => groq(messages) },
          { name: "nebius", call: () => nebius(messages) },
        ]
      : preferredProvider === "nebius"
      ? [
          { name: "nebius", call: () => nebius(messages) },
          { name: "cerebras", call: () => cerebras(messages) },
          { name: "groq", call: () => groq(messages) },
          { name: "pollinations", call: () => pollinationsCall(messages) },
        ]
      : [
          // Knowledge: fast inference first (Cerebras default)
          { name: "cerebras", call: () => cerebras(messages) },
          { name: "groq", call: () => groq(messages) },
          { name: "nebius", call: () => nebius(messages) },
          { name: "pollinations", call: () => pollinationsCall(messages) },
        ];

  for (const { name, call } of order) {
    try {
      const raw = await call();
      const scenario = parseScenario(raw, query);
      console.info(`[LLM] OK ${name} (live=${isLive})`);
      return { scenario, provider: name };
    } catch (err) {
      console.warn(
        `[LLM] FAIL ${name}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  // All providers failed
  return {
    provider: "error",
    scenario: {
      query,
      summary:
        "I couldn't reach any AI service right now. Please check your connection and try again.",
      blocks: [
        {
          type: "InfoCard",
          props: {
            title: "All providers unavailable",
            body: "Cerebras, Groq, Nebius, and Pollinations all failed to respond. This is usually a CORS restriction in the sandbox or a temporary API outage. Open the browser console to see the specific error for each provider.",
          },
        },
        {
          type: "ActionBar",
          props: {
            actions: [
              { label: "Try again", query },
              {
                label: "Try a simpler query",
                query: "What can you help me with?",
              },
            ],
          },
        },
      ],
    },
  };
}

/**
 * Streaming LLM query — calls onChunk for each text delta.
 * Used for live summary streaming in the UI.
 *
 * Same smart routing as queryLLM but uses SSE streaming.
 */
export async function queryLLMStream(
  query: string,
  onChunk: (chunk: string) => void,
  preferredProvider?: "cerebras" | "nebius"
): Promise<LLMResult> {
  const isLive = needsLiveData(query);
  const messages: ChatMsg[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: query },
  ];

  const order: Array<{
    name: LLMProviderName;
    call: (onChunk: (c: string) => void) => Promise<string>;
  }> = isLive
    ? [
        { name: "pollinations", call: (cb) => pollinationsStream(messages, cb) },
        { name: "cerebras", call: (cb) => cerebrasStream(messages, cb) },
        { name: "groq", call: (cb) => groqStream(messages, cb) },
        { name: "nebius", call: (cb) => nebiusStream(messages, cb) },
      ]
    : preferredProvider === "nebius"
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

  // Non-streaming fallbacks for each provider (used when stream succeeds but JSON is broken)
  const nonStreamOrder: Array<{
    name: LLMProviderName;
    call: () => Promise<string>;
  }> = isLive
    ? [
        { name: "pollinations", call: () => pollinationsCall(messages) },
        { name: "cerebras", call: () => cerebras(messages) },
        { name: "groq", call: () => groq(messages) },
        { name: "nebius", call: () => nebius(messages) },
      ]
    : preferredProvider === "nebius"
    ? [
        { name: "nebius", call: () => nebius(messages) },
        { name: "cerebras", call: () => cerebras(messages) },
        { name: "groq", call: () => groq(messages) },
        { name: "pollinations", call: () => pollinationsCall(messages) },
      ]
    : [
        { name: "cerebras", call: () => cerebras(messages) },
        { name: "groq", call: () => groq(messages) },
        { name: "nebius", call: () => nebius(messages) },
        { name: "pollinations", call: () => pollinationsCall(messages) },
      ];

  // Track which providers had HTTP failures (don't retry them non-stream)
  const httpFailed = new Set<LLMProviderName>();

  for (const { name, call } of order) {
    try {
      const raw = await call(onChunk);
      const scenario = parseScenario(raw, query);
      console.info(`[LLM-stream] OK ${name} (live=${isLive})`);
      return { scenario, provider: name };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[LLM-stream] FAIL ${name}:`, msg);

      // If it was an HTTP error (429, 5xx, network), mark for skip
      if (msg.includes("HTTP ") || msg.includes("abort") || msg.includes("fetch")) {
        httpFailed.add(name);
      }
      // If it was a JSON parse error, the stream completed but output was bad.
      // We'll try this provider non-stream below.
    }
  }

  // All streaming failed — try non-streaming for providers that didn't have HTTP failures
  console.warn("[LLM-stream] All streaming failed, trying non-stream fallbacks");
  for (const { name, call } of nonStreamOrder) {
    if (httpFailed.has(name)) {
      console.info(`[LLM] Skipping ${name} (HTTP failed in stream attempt)`);
      continue;
    }
    try {
      const raw = await call();
      const scenario = parseScenario(raw, query);
      console.info(`[LLM] OK ${name} non-stream (live=${isLive})`);
      return { scenario, provider: name };
    } catch (err) {
      console.warn(
        `[LLM] FAIL ${name} non-stream:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  // All providers failed
  return {
    provider: "error",
    scenario: {
      query,
      summary:
        "I couldn't reach any AI service right now. Please check your connection and try again.",
      blocks: [
        {
          type: "InfoCard",
          props: {
            title: "All providers unavailable",
            body: "Cerebras, Groq, Nebius, and Pollinations all failed to respond. This is usually a CORS restriction in the sandbox or a temporary API outage. Open the browser console to see the specific error for each provider.",
          },
        },
        {
          type: "ActionBar",
          props: {
            actions: [
              { label: "Try again", query },
              {
                label: "Try a simpler query",
                query: "What can you help me with?",
              },
            ],
          },
        },
      ],
    },
  };
}