import { describe, expect, it } from "vitest";
import { LICENSE_IDS, SCENARIOS, checkCompatibility, DIMENSION_KEYS, COMPATIBILITY_STATUSES } from "../../src/index.js";

const FORBIDDEN = /100%|guarantee|definitely safe|always safe|fully legal|100 percent/i;

describe("full licence x licence x scenario matrix", () => {
  const results = LICENSE_IDS.flatMap((a) =>
    LICENSE_IDS.flatMap((b) =>
      SCENARIOS.map((scenario) => ({
        a,
        b,
        scenario,
        result: checkCompatibility({ licenseA: a, licenseB: b, scenario }),
      })),
    ),
  );

  it(`evaluates all ${LICENSE_IDS.length ** 2 * SCENARIOS.length} combinations`, () => {
    expect(results.length).toBe(LICENSE_IDS.length ** 2 * SCENARIOS.length);
  });

  it("returns a well-formed, presentation-independent result for every combination", () => {
    for (const { result } of results) {
      expect(COMPATIBILITY_STATUSES).toContain(result.status);
      expect(Object.keys(result.dimensions).sort()).toEqual([...DIMENSION_KEYS].sort());
      expect(result.shortSummary.length).toBeGreaterThan(10);
      expect(result.sources.length).toBeGreaterThan(0);
      for (const source of result.sources) expect(source.url).toMatch(/^https:\/\//);
      const text = JSON.stringify(result);
      expect(text).not.toMatch(/<[a-z][^>]*>/i); // no HTML
    }
  });

  it("never uses overconfident wording", () => {
    for (const { result } of results) {
      const text = [
        result.shortSummary,
        ...result.explanation,
        ...result.obligations,
        ...result.risks,
        ...result.recommendations,
      ].join(" ");
      expect(text).not.toMatch(FORBIDDEN);
    }
  });

  it("keeps UNKNOWN whenever either licence is Unknown", () => {
    for (const { a, b, result } of results) {
      if (a === "Unknown" || b === "Unknown") expect(result.status, `${a} -> ${b}`).toBe("UNKNOWN");
    }
  });

  it("never reports a clean pass when either side is Custom", () => {
    for (const { a, b, result } of results) {
      if ((a === "Custom" || b === "Custom") && a !== "Unknown" && b !== "Unknown") {
        expect(["MANUAL_REVIEW_REQUIRED", "LIKELY_INCOMPATIBLE"], `${a} -> ${b}`).toContain(result.status);
      }
    }
  });

  it("every triggered rule id is upper snake case", () => {
    for (const { result } of results) {
      for (const rule of result.diagnostics.triggeredRules) expect(rule.ruleId).toMatch(/^[A-Z0-9]+(_[A-Z0-9]+)*$/);
    }
  });

  it("is deterministic", () => {
    const first = checkCompatibility({ licenseA: "LGPL-3.0", licenseB: "Proprietary", scenario: "DEPENDENCY" });
    const second = checkCompatibility({ licenseA: "LGPL-3.0", licenseB: "Proprietary", scenario: "DEPENDENCY" });
    expect(second).toEqual(first);
  });
});
