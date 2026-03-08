import { describe, it, expect } from "vitest";
import { pollinationsImageUrl } from "../pollinations";

const BASE = "https://image.pollinations.ai";
const DEFAULT_MODEL = "z-image-turbo";

describe("pollinationsImageUrl", () => {
  it("returns a URL starting with the image base URL", () => {
    const url = pollinationsImageUrl("a cat");
    expect(url.startsWith(BASE)).toBe(true);
  });

  it("encodes the prompt in the path", () => {
    const url = pollinationsImageUrl("a cat");
    expect(url).toContain(`/prompt/${encodeURIComponent("a cat")}`);
  });

  it("URI-encodes spaces in the prompt", () => {
    const url = pollinationsImageUrl("futuristic city skyline");
    expect(url).toContain("futuristic%20city%20skyline");
  });

  it("URI-encodes special characters in the prompt", () => {
    const url = pollinationsImageUrl("cat & dog + fish");
    expect(url).toContain(encodeURIComponent("cat & dog + fish"));
  });

  it("uses default width and height of 1024", () => {
    const url = pollinationsImageUrl("test");
    const params = new URL(url).searchParams;
    expect(params.get("width")).toBe("1024");
    expect(params.get("height")).toBe("1024");
  });

  it("applies custom width and height", () => {
    const url = pollinationsImageUrl("test", { width: 200, height: 300 });
    const params = new URL(url).searchParams;
    expect(params.get("width")).toBe("200");
    expect(params.get("height")).toBe("300");
  });

  it("uses default model z-image-turbo", () => {
    const url = pollinationsImageUrl("test");
    const params = new URL(url).searchParams;
    expect(params.get("model")).toBe(DEFAULT_MODEL);
  });

  it("applies custom model", () => {
    const url = pollinationsImageUrl("test", { model: "flux" });
    const params = new URL(url).searchParams;
    expect(params.get("model")).toBe("flux");
  });

  it("sets nologo=true by default", () => {
    const url = pollinationsImageUrl("test");
    const params = new URL(url).searchParams;
    expect(params.get("nologo")).toBe("true");
  });

  it("allows overriding nologo to false", () => {
    const url = pollinationsImageUrl("test", { nologo: false });
    const params = new URL(url).searchParams;
    expect(params.get("nologo")).toBe("false");
  });

  it("sets enhance=false by default", () => {
    const url = pollinationsImageUrl("test");
    const params = new URL(url).searchParams;
    expect(params.get("enhance")).toBe("false");
  });

  it("allows overriding enhance to true", () => {
    const url = pollinationsImageUrl("test", { enhance: true });
    const params = new URL(url).searchParams;
    expect(params.get("enhance")).toBe("true");
  });

  it("omits seed param when seed is undefined", () => {
    const url = pollinationsImageUrl("test");
    const params = new URL(url).searchParams;
    expect(params.has("seed")).toBe(false);
  });

  it("includes seed param when seed is provided", () => {
    const url = pollinationsImageUrl("test", { seed: 42 });
    const params = new URL(url).searchParams;
    expect(params.get("seed")).toBe("42");
  });

  it("handles empty prompt without throwing", () => {
    expect(() => pollinationsImageUrl("")).not.toThrow();
  });

  it("returns a valid URL for empty prompt", () => {
    const url = pollinationsImageUrl("");
    expect(() => new URL(url)).not.toThrow();
  });
});
