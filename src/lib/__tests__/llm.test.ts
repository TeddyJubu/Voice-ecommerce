import { describe, it, expect } from "vitest";
import {
  needsLiveData,
  extractJSON,
  repairJSON,
  parseScenario,
} from "../llm";

// ─── needsLiveData ────────────────────────────────────────────────────────────

describe("needsLiveData", () => {
  it("returns false for empty string", () => {
    expect(needsLiveData("")).toBe(false);
  });

  it("returns false for pure knowledge query", () => {
    expect(needsLiveData("best noise cancelling headphones")).toBe(false);
  });

  it("returns false for how-to query", () => {
    expect(needsLiveData("how to boil an egg")).toBe(false);
  });

  it("returns true for news keyword", () => {
    expect(needsLiveData("latest news today")).toBe(true);
  });

  it("returns true for bitcoin price", () => {
    expect(needsLiveData("bitcoin price")).toBe(true);
  });

  it("returns true for weather query", () => {
    expect(needsLiveData("weather in Paris")).toBe(true);
  });

  it("returns true for trending query", () => {
    expect(needsLiveData("what's trending on twitter")).toBe(true);
  });

  it("returns true for year in query (2025)", () => {
    expect(needsLiveData("best TV in 2025")).toBe(true);
  });

  it("returns true for sports score", () => {
    expect(needsLiveData("NBA score last night")).toBe(true);
  });

  it("returns true for crypto symbol", () => {
    expect(needsLiveData("ethereum market cap")).toBe(true);
  });

  it("returns true for 'today'", () => {
    expect(needsLiveData("what happened today")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(needsLiveData("LATEST NEWS")).toBe(true);
    expect(needsLiveData("WEATHER IN LONDON")).toBe(true);
  });
});

// ─── extractJSON ──────────────────────────────────────────────────────────────

describe("extractJSON", () => {
  it("extracts a bare JSON object", () => {
    const input = '{"summary":"hello","blocks":[]}';
    expect(extractJSON(input)).toBe('{"summary":"hello","blocks":[]}');
  });

  it("extracts JSON wrapped in markdown json fence", () => {
    const input = '```json\n{"summary":"hi"}\n```';
    expect(extractJSON(input)).toBe('{"summary":"hi"}');
  });

  it("extracts JSON wrapped in plain code fence", () => {
    const input = '```\n{"summary":"hi"}\n```';
    expect(extractJSON(input)).toBe('{"summary":"hi"}');
  });

  it("ignores text before the opening brace", () => {
    const input = 'Sure, here is the JSON: {"key":"value"}';
    expect(extractJSON(input)).toBe('{"key":"value"}');
  });

  it("ignores text after the closing brace", () => {
    const input = '{"key":"value"} — hope that helps!';
    expect(extractJSON(input)).toBe('{"key":"value"}');
  });

  it("handles deeply nested objects", () => {
    const input = '{"a":{"b":{"c":1}}}';
    expect(extractJSON(input)).toBe('{"a":{"b":{"c":1}}}');
  });

  it("does not close early on } inside a string value", () => {
    const input = '{"key":"has } brace","x":1}';
    const result = extractJSON(input);
    expect(result).toBe('{"key":"has } brace","x":1}');
  });

  it("throws when no { is found", () => {
    expect(() => extractJSON("no json here")).toThrow("No JSON object in response");
  });

  it("throws for unclosed braces", () => {
    expect(() => extractJSON('{"key":"value"')).toThrow("Unterminated JSON object");
  });

  it("handles escaped quotes inside strings without closing early", () => {
    const input = '{"key":"say \\"hello\\"","done":true}';
    expect(extractJSON(input)).toBe('{"key":"say \\"hello\\"","done":true}');
  });
});

// ─── repairJSON ───────────────────────────────────────────────────────────────

describe("repairJSON", () => {
  it("leaves valid JSON unchanged", () => {
    const valid = '{"a":1,"b":[2,3]}';
    expect(JSON.parse(repairJSON(valid))).toEqual({ a: 1, b: [2, 3] });
  });

  it("removes trailing comma in array", () => {
    const result = repairJSON('{"arr":[1,2,3,]}');
    expect(JSON.parse(result)).toEqual({ arr: [1, 2, 3] });
  });

  it("removes trailing comma in object", () => {
    const result = repairJSON('{"a":1,"b":2,}');
    expect(JSON.parse(result)).toEqual({ a: 1, b: 2 });
  });

  it("replaces NaN with null", () => {
    const result = repairJSON('{"n": NaN}');
    expect(JSON.parse(result)).toEqual({ n: null });
  });

  it("replaces Infinity with null", () => {
    const result = repairJSON('{"n": Infinity}');
    expect(JSON.parse(result)).toEqual({ n: null });
  });

  it("replaces -Infinity with null", () => {
    const result = repairJSON('{"n": -Infinity}');
    expect(JSON.parse(result)).toEqual({ n: null });
  });

  it("closes unclosed object", () => {
    const result = repairJSON('{"a":1');
    expect(JSON.parse(result)).toEqual({ a: 1 });
  });

  it("closes unclosed nested array then object", () => {
    const result = repairJSON('{"arr":[1,2');
    expect(JSON.parse(result)).toEqual({ arr: [1, 2] });
  });

  it("escapes literal newlines inside strings", () => {
    // Use actual newline in string value
    const input = '{"msg": "line1\nline2"}';
    const result = repairJSON(input);
    expect(JSON.parse(result).msg).toBe("line1\nline2");
  });
});

// ─── parseScenario ────────────────────────────────────────────────────────────

describe("parseScenario", () => {
  const validRaw = JSON.stringify({
    summary: "Here is your answer.",
    blocks: [
      { type: "InfoCard", props: { title: "Test", body: "Body text." } },
      { type: "ActionBar", props: { actions: [{ label: "More", query: "more" }] } },
    ],
  });

  it("parses valid JSON with all fields", () => {
    const scenario = parseScenario(validRaw, "test query");
    expect(scenario.query).toBe("test query");
    expect(scenario.summary).toBe("Here is your answer.");
    expect(scenario.blocks).toHaveLength(2);
    expect(scenario.blocks[0].type).toBe("InfoCard");
  });

  it("normalises alternate summary field name 'message'", () => {
    const raw = JSON.stringify({ message: "Alt summary.", blocks: [] });
    const scenario = parseScenario(raw, "q");
    expect(scenario.summary).toBe("Alt summary.");
  });

  it("normalises alternate summary field name 'response'", () => {
    const raw = JSON.stringify({ response: "Response text.", blocks: [] });
    const scenario = parseScenario(raw, "q");
    expect(scenario.summary).toBe("Response text.");
  });

  it("normalises alternate summary field name 'answer'", () => {
    const raw = JSON.stringify({ answer: "Answer text.", blocks: [] });
    const scenario = parseScenario(raw, "q");
    expect(scenario.summary).toBe("Answer text.");
  });

  it("normalises alternate blocks field name 'cards'", () => {
    const raw = JSON.stringify({
      summary: "OK",
      cards: [{ type: "InfoCard", props: {} }],
    });
    const scenario = parseScenario(raw, "q");
    expect(scenario.blocks).toHaveLength(1);
  });

  it("normalises alternate blocks field name 'ui'", () => {
    const raw = JSON.stringify({ summary: "OK", ui: [{ type: "ActionBar", props: {} }] });
    const scenario = parseScenario(raw, "q");
    expect(scenario.blocks).toHaveLength(1);
  });

  it("returns empty blocks array when no blocks field present", () => {
    const raw = JSON.stringify({ summary: "Just the summary." });
    const scenario = parseScenario(raw, "q");
    expect(scenario.blocks).toEqual([]);
  });

  it("repairs malformed JSON (trailing comma) and parses", () => {
    const raw = '{"summary":"Repaired","blocks":[{"type":"InfoCard","props":{},}]}';
    const scenario = parseScenario(raw, "q");
    expect(scenario.summary).toBe("Repaired");
    expect(scenario.blocks).toHaveLength(1);
  });

  it("strips markdown code fences before parsing", () => {
    const raw = "```json\n" + validRaw + "\n```";
    const scenario = parseScenario(raw, "q");
    expect(scenario.summary).toBe("Here is your answer.");
  });

  it("throws on empty string input", () => {
    expect(() => parseScenario("", "q")).toThrow("Empty response");
  });

  it("throws when JSON is completely unparseable with no summary", () => {
    expect(() => parseScenario("this is not JSON at all", "q")).toThrow();
  });

  it("regex fallback: returns InfoCard + ActionBar when only summary extractable", () => {
    // extractJSON succeeds (balanced braces) but JSON.parse and repairJSON both fail
    const raw = '{"summary":"Fallback summary","blocks": NOT_VALID_JSON_AT_ALL }';
    const scenario = parseScenario(raw, "q");
    expect(scenario.summary).toContain("Fallback summary");
    expect(scenario.blocks.length).toBeGreaterThan(0);
  });
});
