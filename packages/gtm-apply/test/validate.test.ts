import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { normalizeExport } from "../src/spec/normalize.js";
import {
  assertValidSpec,
  formatIssue,
  SpecValidationError,
  validateSpec,
} from "../src/spec/validate.js";

const fixture = () =>
  JSON.parse(readFileSync(new URL("./fixtures/ui-export.json", import.meta.url), "utf-8"));

describe("validateSpec", () => {
  it("accepts a normalized UI export", () => {
    expect(validateSpec(normalizeExport(fixture()))).toEqual([]);
  });

  it("reports bad enum values with the entity name and field path", () => {
    const issues = validateSpec({
      trigger: [{ name: "CE", type: "custom_event" }],
      tag: [
        {
          name: "Ads - Lead",
          type: "awct",
          tagFiringOption: "once",
          parameter: [{ type: "TEMPLATE", key: "conversionId", value: "x" }],
          consentSettings: { consentStatus: "maybe" },
        },
      ],
      builtInVariable: ["pagePath", "PAGE_PATH"],
    });
    expect(issues.map(formatIssue)).toEqual([
      expect.stringMatching(
        /^trigger "CE": type must be one of .*customEvent.* \(got "custom_event"\)$/
      ),
      expect.stringMatching(
        /^tag "Ads - Lead": tagFiringOption must be one of unlimited, oncePerEvent, oncePerLoad \(got "once"\)$/
      ),
      expect.stringMatching(
        /^tag "Ads - Lead": parameter\[0\]\.type must be one of template, .* \(got "TEMPLATE"\)$/
      ),
      expect.stringMatching(
        /^tag "Ads - Lead": consentSettings\.consentStatus must be one of notSet, notNeeded, needed \(got "maybe"\)$/
      ),
      expect.stringMatching(
        /^spec: builtInVariable\[1\] must be one of pageUrl, .*, … \(\d+ values\) \(got "PAGE_PATH"\)$/
      ),
    ]);
  });

  it("reports unknown fields, wrong primitive types, nulls, and id fields", () => {
    const issues = validateSpec({
      variable: [
        { name: "V", type: "c", parametr: [], notes: 5, scheduleStartMs: null, variableId: "7" },
      ],
      tag: [
        { name: "T", type: "html", paused: "yes", parentFolderId: "5", firingTriggerName: "PV" },
      ],
      folder: [{ name: "F", parentFolderName: "X" }],
      environment: [],
    });
    expect(issues.map(formatIssue)).toEqual([
      expect.stringMatching(/^variable "V": parametr is not a field of Variable/),
      'variable "V": notes must be a string (got number)',
      'variable "V": scheduleStartMs must be omitted rather than null',
      expect.stringMatching(/^variable "V": variableId is a server or id field/),
      'tag "T": paused must be a boolean (got "yes")',
      expect.stringMatching(/^tag "T": parentFolderId is a server or id field/),
      'tag "T": firingTriggerName must be an array (got "PV")',
      expect.stringMatching(/^folder "F": parentFolderName is not a field of Folder/),
      expect.stringMatching(/^spec: environment is not a spec section/),
    ]);
  });

  it("requires a name on every entity and a type on all but folders", () => {
    const issues = validateSpec({
      trigger: [{ type: "pageview" }, { name: "" }, "nope"],
      folder: [{}],
    });
    expect(issues.map(formatIssue)).toEqual([
      "trigger[0]: name is required",
      "trigger[1]: name is required",
      "trigger[1]: type is required",
      'trigger[2] must be an object (got "nope")',
      "folder[0]: name is required",
    ]);
  });

  it("walks nested parameters recursively", () => {
    const issues = validateSpec({
      variable: [
        {
          name: "V",
          type: "smm",
          parameter: [
            {
              type: "list",
              key: "map",
              list: [{ type: "map", map: [{ type: "tmpl", key: "k" }] }],
            },
          ],
        },
      ],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0].path).toBe("parameter[0].list[0].map[0].type");
  });

  it("rejects non-object input", () => {
    expect(validateSpec("x")[0].message).toMatch(/must be an object/);
    expect(validateSpec({ tag: {} })[0].message).toMatch(/must be an array/);
  });

  it("assertValidSpec throws one error listing every issue", () => {
    expect(() => assertValidSpec({ trigger: [{ name: "A", type: "x" }, { name: "B" }] })).toThrow(
      SpecValidationError
    );
    try {
      assertValidSpec({ trigger: [{ name: "A", type: "x" }, { name: "B" }] });
    } catch (err) {
      expect((err as SpecValidationError).issues).toHaveLength(2);
      expect((err as Error).message).toContain('trigger "B": type is required');
    }
    expect(() => assertValidSpec({ trigger: [{ name: "A", type: "pageview" }] })).not.toThrow();
  });
});
