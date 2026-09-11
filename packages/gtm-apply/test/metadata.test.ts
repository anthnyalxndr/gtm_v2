import { describe, it, expect } from "vitest";
import {
  NOTED_KINDS,
  formatNotes,
  parseNotes,
  parseRecipeList,
  readMetadata,
} from "../src/library/metadata.js";
import { notesEncoding, registerEncoding, resolveEncoding } from "../src/library/encoding.js";

describe("parseNotes", () => {
  it("splits customer text from a JSON trailer after the last --- line", () => {
    const parsed = parseNotes(
      'Fires on the lead form.\n---\nSee the runbook.\n---\n{"recipes": ["form_submit"], "owner": "me"}'
    );
    expect(parsed).toEqual({
      text: "Fires on the lead form.\n---\nSee the runbook.",
      metadata: { recipes: ["form_submit"], owner: "me" },
    });
  });

  it("yields no metadata without a trailer, or when the trailer is not JSON-shaped", () => {
    expect(parseNotes("Plain note")).toEqual({ text: "Plain note" });
    expect(parseNotes("Above\n---\nbelow, but prose")).toEqual({
      text: "Above\n---\nbelow, but prose",
    });
    expect(parseNotes(undefined)).toEqual({ text: "" });
    expect(parseNotes(null)).toEqual({ text: "" });
  });

  it("reports a trailer that starts with { but does not parse, or is not an object", () => {
    const bad = parseNotes("Text\n---\n{recipes: [a]}");
    expect(bad.text).toBe("Text");
    expect(bad.metadata).toBeUndefined();
    expect(bad.error).toMatch(/not valid JSON/);
    expect(parseNotes("---\n{}").metadata).toEqual({});
    expect(parseNotes('Text\n--- \n {"a":1} ').metadata).toEqual({ a: 1 });
  });

  it("accepts recipes as a list or a comma separated string", () => {
    expect(parseNotes('---\n{"recipes": "a, b c"}').metadata?.recipes).toEqual(["a", "b", "c"]);
    expect(parseRecipeList("")).toEqual([]);
  });
});

describe("formatNotes", () => {
  it("round-trips through parseNotes, with and without text", () => {
    const meta = { recipes: ["x"], placeholder: { kind: "path", example: "/contact" } };
    expect(formatNotes("Hello", meta)).toBe(
      'Hello\n---\n{"recipes":["x"],"placeholder":{"kind":"path","example":"/contact"}}'
    );
    expect(parseNotes(formatNotes("Hello\n", meta))).toEqual({ text: "Hello", metadata: meta });
    expect(formatNotes("", meta).startsWith("---\n")).toBe(true);
    expect(parseNotes(formatNotes("", meta))).toEqual({ text: "", metadata: meta });
    expect(formatNotes("Just text")).toBe("Just text");
    expect(formatNotes("Just text", {})).toBe("Just text");
  });
});

describe("notesEncoding", () => {
  const e = notesEncoding();

  it("reads the trailer and hands the customer the text alone", () => {
    const tag = { name: "T", type: "html", notes: 'Keep me.\n---\n{"recipes":["a"]}' };
    expect(e.read(tag)).toEqual({ metadata: { recipes: ["a"] } });
    expect(e.forCustomer(tag)).toEqual({ name: "T", type: "html", notes: "Keep me." });
    expect(e.forCustomer({ name: "T", notes: '---\n{"recipes":["a"]}' })).toEqual({ name: "T" });
    const plain = { name: "T", notes: "Plain" };
    expect(e.forCustomer(plain)).toBe(plain);
    const none = { name: "T" };
    expect(e.forCustomer(none)).toBe(none);
    expect(e.read({ name: "T", notes: "---\n{oops" }).error).toMatch(/not valid JSON/);
  });

  it("is the registered default and unknown names throw", () => {
    expect(resolveEncoding("notes").name).toBe("notes");
    expect(() => resolveEncoding("nope")).toThrow(
      /Unknown recipe encoding "nope"; registered: notes/
    );
    registerEncoding("custom", () => ({ ...e, name: "custom" }));
    expect(resolveEncoding("custom").name).toBe("custom");
  });
});

describe("readMetadata", () => {
  it("indexes every noted kind by kind:name and collects errors", () => {
    expect(NOTED_KINDS).not.toContain("folder");
    const { index, errors } = readMetadata(
      {
        variable: [{ name: "V", type: "c", notes: '---\n{"placeholder":{"kind":"path"}}' }],
        trigger: [{ name: "Tr", type: "pageview", notes: "prose only" }],
        tag: [
          { name: "T", type: "html", notes: '---\n{"recipes":["r"]}' },
          { name: "Bad", type: "html", notes: "---\n{" },
          { type: "html" },
        ],
      },
      notesEncoding()
    );
    expect(index).toEqual({
      "variable:V": { placeholder: { kind: "path" } },
      "tag:T": { recipes: ["r"] },
    });
    expect(errors).toEqual([
      { ref: { kind: "tag", name: "Bad" }, message: expect.stringMatching(/not valid JSON/) },
    ]);
  });
});
