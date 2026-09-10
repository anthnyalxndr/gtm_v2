import { describe, it, expect } from "vitest";
import {
  builtInTypeForName,
  upperSnakeToCamel,
  referencedVariableNames,
} from "../src/spec/catalog.js";

describe("catalog", () => {
  it("maps display names to API types", () => {
    expect(builtInTypeForName("Page Path")).toBe("pagePath");
    expect(builtInTypeForName("Form ID")).toBe("formId");
    expect(builtInTypeForName("Not A Built In")).toBeUndefined();
  });

  it("converts upper snake to lower camel", () => {
    expect(upperSnakeToCamel("CUSTOM_EVENT")).toBe("customEvent");
    expect(upperSnakeToCamel("TEMPLATE")).toBe("template");
    expect(upperSnakeToCamel("PAGE_PATH")).toBe("pagePath");
    expect(upperSnakeToCamel("ONCE_PER_EVENT")).toBe("oncePerEvent");
  });

  it("finds {{ }} references anywhere in a value", () => {
    const refs = referencedVariableNames({
      a: "{{Page Path}} and {{ Form ID }}",
      b: [{ c: "{{_event}}" }, "none"],
    });
    expect([...refs].sort()).toEqual(["Form ID", "Page Path", "_event"]);
  });
});
