import { describe, expect, it } from "vitest";
import {
  analyzeProject,
  analyzeSourceCodeAcquisition,
  checkCompatibility,
  getLicense,
  getLicenses,
  normalizeLicense,
} from "../src/index.js";

// Every example in README.md, with the values the README claims.
describe("README examples", () => {
  it("quick start", () => {
    const result = checkCompatibility({
      licenseA: "GPL-3.0",
      licenseB: "Proprietary",
      scenario: "PROPRIETARY_SOFTWARE",
    });
    expect(result.status).toBe("LIKELY_INCOMPATIBLE");
    expect(result.direction).toBe("Using GPL-3.0-licensed code in a proprietary project");
    expect(result.diagnostics.triggeredRules.map((r) => r.ruleId)).toContain("GPL_STRONG_COPYLEFT_DISTRIBUTION");
  });

  it("SaaS examples", () => {
    expect(checkCompatibility({ licenseA: "GPL-3.0", licenseB: "Proprietary", scenario: "SAAS" }).status).toBe(
      "COMPATIBLE_WITH_CONDITIONS",
    );
    expect(
      checkCompatibility({ licenseA: "AGPL-3.0", licenseB: "Proprietary", scenario: "SAAS", modified: true }).status,
    ).toBe("LIKELY_INCOMPATIBLE");
  });

  it("direction examples", () => {
    expect(
      checkCompatibility({ licenseA: "Apache-2.0", licenseB: "GPL-3.0", scenario: "DISTRIBUTE_BINARY" }).status,
    ).toBe("COMPATIBLE_WITH_CONDITIONS");
    expect(
      checkCompatibility({ licenseA: "GPL-3.0", licenseB: "Apache-2.0", scenario: "DISTRIBUTE_BINARY" }).status,
    ).toBe("POTENTIAL_CONFLICT");
  });

  it("analyzeProject example", () => {
    const analysis = analyzeProject({ licenses: ["MIT", "Apache-2.0", "BSD-3-Clause", "GPL-3.0", "PROPRIETARY"] });
    expect(analysis.overallRisk).toBe("HIGH");
    expect(analysis.effectiveProjectLicense).toBe("Proprietary");
    expect(analysis.sections.copyleftRisk.level).toBe("HIGH");
    expect(analysis.sections.copyleftRisk.licenses).toEqual(["GPL-3.0"]);
    expect(analysis.sections.copyleftRisk.ruleIds).toContain("GPL_STRONG_COPYLEFT_DISTRIBUTION");
  });

  it("analyzeSourceCodeAcquisition example", () => {
    const report = analyzeSourceCodeAcquisition({
      mainProjectLicense: "Proprietary",
      thirdPartyLicenses: ["MIT", "GPL-3.0"],
      commercialUse: true,
      saas: false,
      redistribution: true,
      modification: true,
      whiteLabel: false,
      resale: false,
    });
    expect(report.overallRisk).toBe("HIGH");
    expect(report.sections.copyleftRisk.level).toBe("HIGH");
    expect(report.sellerQuestions.map((q) => q.topic)).toEqual(
      expect.arrayContaining(["COPYRIGHT_OWNERSHIP", "FONTS", "ICONS", "DATASETS"]),
    );
  });

  it("licence examples", () => {
    expect(getLicense("GPL-3.0-or-later").id).toBe("GPL-3.0");
    expect(getLicenses()).toHaveLength(21);
    expect(normalizeLicense("GPL-2.0+")).toMatchObject({ id: "GPL-2.0", orLater: true, recognized: true });
    expect(normalizeLicense("UNLICENSED").id).toBe("Proprietary");
    expect(normalizeLicense("WTFPL")).toMatchObject({ id: "Unknown", recognized: false });
  });
});
