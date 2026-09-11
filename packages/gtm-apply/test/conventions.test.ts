import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import {
  checkNames,
  DEFAULT_CONVENTIONS,
  externalName,
  mergeConventions,
} from "../src/spec/conventions.js";
import { normalizeExport } from "../src/spec/normalize.js";
import { formatIssue } from "../src/spec/validate.js";

const fixture = () =>
  normalizeExport(
    JSON.parse(readFileSync(new URL("./fixtures/ui-export.json", import.meta.url), "utf-8"))
  );

describe("checkNames", () => {
  it("passes the fixture with the defaults", () => {
    expect(checkNames(fixture())).toEqual([]);
  });

  it("reports missing prefixes, forbidden characters, and pattern misses with the rule", () => {
    const issues = checkNames(
      {
        folder: [{ name: "shared" }],
        variable: [
          { name: "Ads ID", type: "c" },
          { name: "Library - Manifest", type: "c" },
          { name: "phone", type: "v" },
        ],
        trigger: [
          { name: "lead", type: "customEvent" },
          { name: "All Pages", type: "pageview" },
        ],
        tag: [
          { name: "Lead", type: "gaawe" },
          { name: "Ads: Lead", type: "awct" },
          { name: "Anything goes", type: "html" },
        ],
      },
      mergeConventions({ patterns: { folder: "^[A-Z]" } })
    );
    expect(issues.map(formatIssue)).toEqual([
      'folder "shared": name must match /^[A-Z]/',
      'variable "Ads ID": name must start with "Const - " (c variables)',
      'variable "phone": name must start with "DLV - " (v variables)',
      'trigger "lead": name must start with "Custom Event - " (customEvent triggers)',
      'trigger "All Pages": name must start with "Pageview - " (pageview triggers)',
      'tag "Lead": name must start with "GA4 - " (gaawe tags)',
      'tag "Ads: Lead": name contains a character matching /[:]/',
      'tag "Ads: Lead": name must start with "Ads - " (awct tags)',
    ]);
  });

  it("merges overrides key by key over the defaults", () => {
    const c = mergeConventions(
      { tagPrefixes: { gaawe: "GA4 Event - " }, forbidden: "[:|]" },
      { triggerPrefixes: { pageview: "" } }
    );
    expect(c.tagPrefixes.gaawe).toBe("GA4 Event - ");
    expect(c.tagPrefixes.awct).toBe("Ads - ");
    expect(c.forbidden).toBe("[:|]");
    expect(c.triggerPrefixes.pageview).toBe("");
    expect(c.manifestName).toBe(DEFAULT_CONVENTIONS.manifestName);
    expect(
      checkNames(
        {
          tag: [{ name: "GA4 Event - lead", type: "gaawe" }],
          trigger: [{ name: "All Pages", type: "pageview" }],
        },
        c
      )
    ).toEqual([]);
    expect(DEFAULT_CONVENTIONS.tagPrefixes.gaawe).toBe("GA4 - ");
  });

  it("fills external name templates", () => {
    expect(externalName(DEFAULT_CONVENTIONS, "googleAds", "conversionAction", "form_submit")).toBe(
      "GTM - form_submit"
    );
    expect(externalName(DEFAULT_CONVENTIONS, "ga4", "keyEvent", "form_submit")).toBe("form_submit");
    expect(externalName(DEFAULT_CONVENTIONS, "x", "y", "r")).toBeUndefined();
    expect(externalName(DEFAULT_CONVENTIONS, "x", "y", "r", "Lead ${recipe} ${recipe}")).toBe(
      "Lead r r"
    );
  });
});
