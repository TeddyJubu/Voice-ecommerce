import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn", () => {
  it("returns empty string with no arguments", () => {
    expect(cn()).toBe("");
  });

  it("returns a single class unchanged", () => {
    expect(cn("text-sm")).toBe("text-sm");
  });

  it("concatenates two non-conflicting classes", () => {
    expect(cn("text-sm", "font-bold")).toBe("text-sm font-bold");
  });

  it("resolves conflicting padding utilities (last wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("resolves conflicting background color utilities (last wins)", () => {
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
  });

  it("resolves conflicting text size utilities (last wins)", () => {
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });

  it("filters out undefined values", () => {
    expect(cn("a", undefined, "b")).toBe("a b");
  });

  it("filters out null values", () => {
    // clsx treats null as falsy
    expect(cn("a", null as any, "b")).toBe("a b");
  });

  it("filters out false values", () => {
    expect(cn("a", false as any, "b")).toBe("a b");
  });

  it("supports object syntax — includes truthy keys", () => {
    expect(cn({ "text-red-500": true, "text-blue-500": false })).toBe("text-red-500");
  });

  it("supports object syntax — excludes falsy keys", () => {
    const result = cn({ "hidden": false, "block": true });
    expect(result).toBe("block");
  });

  it("supports array syntax", () => {
    expect(cn(["text-sm", "font-bold"])).toBe("text-sm font-bold");
  });

  it("combines string, object, and array inputs", () => {
    const result = cn("p-4", { "rounded": true, "shadow": false }, ["text-sm"]);
    expect(result).toContain("p-4");
    expect(result).toContain("rounded");
    expect(result).toContain("text-sm");
    expect(result).not.toContain("shadow");
  });

  it("resolves multiple Tailwind conflicts correctly", () => {
    // margin-x conflict: mx-2 then mx-8 → mx-8
    expect(cn("mx-2", "mx-8")).toBe("mx-8");
  });
});
