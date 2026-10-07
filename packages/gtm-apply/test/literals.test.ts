import { describe, it, expect } from "vitest";
import { classifyLiteral, describeLiteral, findLiterals } from "../src/library/literals.js";

describe("classifyLiteral", () => {
  it("recognises site-specific shapes", () => {
    const kind = (v: string) => classifyLiteral(v)?.kind;
    expect(kind("https://example.com/thanks")).toBe("url");
    expect(kind("http://localhost:3000")).toBe("url");
    expect(kind("sales@example.com")).toBe("email");
    expect(kind("www.example.com")).toBe("hostname");
    expect(kind("shop.example.co.uk")).toBe("hostname");
    expect(kind("/contact")).toBe("path");
    expect(kind("/contact/|/about")).toBe("path");
    expect(kind("#contact-form")).toBe("selector");
    expect(kind(".btn-primary > span")).toBe("selector");
    expect(kind("G-ABC123")).toBe("platformId");
    expect(kind("AW-123456789")).toBe("platformId");
    expect(kind("GTM-ABCD123")).toBe("platformId");
    expect(kind("  /padded  ")).toBe("path");
    expect(kind("{{Page Hostname}}/checkout")).toBe("path");
  });

  it("leaves generic values alone", () => {
    const kind = (v: string) => classifyLiteral(v)?.kind;
    expect(kind("mailto:")).toBeUndefined();
    expect(kind("tel:")).toBeUndefined();
    expect(kind("form_submit")).toBeUndefined();
    expect(kind("generate_lead")).toBeUndefined();
    expect(kind("true")).toBeUndefined();
    expect(kind("0.5")).toBeUndefined();
    expect(kind("/")).toBeUndefined();
    expect(kind("USD")).toBeUndefined();
    expect(kind("")).toBeUndefined();
    expect(kind("{{Click URL}}")).toBeUndefined();
    expect(kind("tel:{{DLV - phone}}")).toBeUndefined();
    expect(kind("gtm.click")).toBeUndefined();
    expect(kind("gtm.js")).toBeUndefined();
    expect(kind("<G-XXXXXXX>")).toBeUndefined();
  });

  it("honours the allowlist and the template site's hosts", () => {
    expect(classifyLiteral("/contact", { allow: ["/contact"] })).toBeUndefined();
    expect(classifyLiteral(" /contact ", { allow: ["/contact "] })).toBeUndefined();
    expect(classifyLiteral("Thanks for visiting Example.com!", { hosts: ["example.com"] })).toEqual(
      {
        kind: "siteHost",
        value: "Thanks for visiting Example.com!",
      }
    );
    expect(classifyLiteral("https://example.com", { hosts: ["example.com"] })?.kind).toBe(
      "siteHost"
    );
    expect(classifyLiteral("example.com", { allow: ["example.com"], hosts: ["example.com"] })).toBe(
      undefined
    );
  });
});

describe("findLiterals", () => {
  it("walks parameters, lists, maps and every condition field with a path", () => {
    const findings = findLiterals(
      {
        parameter: [
          { type: "template", key: "eventName", value: "form_submit" },
          { type: "template", key: "sendTo", value: "https://example.com/collect" },
          {
            type: "list",
            key: "rows",
            list: [
              {
                type: "map",
                map: [
                  { type: "template", key: "key", value: "/pricing" },
                  { type: "template", key: "value", value: "pricing" },
                ],
              },
              { type: "template", value: "#hero" },
            ],
          },
        ],
        filter: [
          {
            type: "equals",
            parameter: [
              { type: "template", key: "arg0", value: "{{Page Path}}" },
              { type: "template", key: "arg1", value: "/contact" },
            ],
          },
        ],
        customEventFilter: [
          {
            type: "equals",
            parameter: [
              { type: "template", key: "arg0", value: "{{_event}}" },
              { type: "template", key: "arg1", value: "gtm.click" },
            ],
          },
        ],
        autoEventFilter: [
          {
            type: "cssSelector",
            parameter: [
              { type: "template", key: "arg0", value: "{{Click Element}}" },
              { type: "template", key: "arg1", value: ".buy-now" },
            ],
          },
        ],
      },
      {},
      (value) => value === "#hero"
    );
    expect(findings).toEqual([
      { path: "parameter.sendTo", hit: { kind: "url", value: "https://example.com/collect" } },
      { path: "parameter.rows.list[0].map.key", hit: { kind: "path", value: "/pricing" } },
      { path: "filter[0].arg1", hit: { kind: "path", value: "/contact" } },
      { path: "autoEventFilter[0].arg1", hit: { kind: "selector", value: ".buy-now" } },
    ]);
    expect(findLiterals({})).toEqual([]);
  });

  it("describes hits for messages", () => {
    expect(describeLiteral({ kind: "url", value: "x" })).toBe("looks like a URL");
    expect(describeLiteral({ kind: "path", value: "x" })).toBe("looks like a path");
    expect(describeLiteral({ kind: "selector", value: "x" })).toBe("looks like a CSS selector");
    expect(describeLiteral({ kind: "email", value: "x" })).toBe("looks like an email address");
    expect(describeLiteral({ kind: "platformId", value: "x" })).toBe("looks like a platform id");
    expect(describeLiteral({ kind: "siteHost", value: "x" })).toBe("names the template site");
  });
});
