import { describe, expect, it } from "vitest";
import { analyzeProject } from "../../src/index.js";

describe("analyzeProject", () => {
  it("flags GPL-3.0 in a project that contains proprietary code", () => {
    const analysis = analyzeProject({ licenses: ["MIT", "Apache-2.0", "BSD-3-Clause", "GPL-3.0", "PROPRIETARY"] });
    expect(analysis.effectiveProjectLicense).toBe("Proprietary");
    expect(analysis.overallRisk).toBe("HIGH");
    const gpl = analysis.warnings.find((warning) => warning.license === "GPL-3.0");
    expect(gpl?.ruleIds).toContain("GPL_STRONG_COPYLEFT_DISTRIBUTION");
    expect(analysis.sections.copyleftRisk.level).toBe("HIGH");
    expect(analysis.sections.copyleftRisk.licenses).toEqual(["GPL-3.0"]);
    expect(analysis.sections.proprietaryCompatibility.level).toBe("HIGH");
    expect(analysis.sections.attributionRequirements.licenses).toEqual(
      expect.arrayContaining(["MIT", "Apache-2.0", "BSD-3-Clause"]),
    );
    expect(analysis.sections.patentClauses.licenses).toEqual(expect.arrayContaining(["Apache-2.0", "GPL-3.0"]));
    expect(analysis.sections.unknownLicenses.level).toBe("NONE");
    // the project's own proprietary code is not checked against itself
    expect(analysis.checks.map((check) => check.input)).not.toContain("PROPRIETARY");
  });

  it("does not hide risk behind a single score: every section carries its own level and rule ids", () => {
    const analysis = analyzeProject({ licenses: ["MIT", "GPL-3.0", "PROPRIETARY"] });
    for (const section of Object.values(analysis.sections)) {
      expect(section).toHaveProperty("level");
      expect(section).toHaveProperty("ruleIds");
      expect(section).toHaveProperty("licenses");
    }
    expect(analysis.sections.copyleftRisk.ruleIds).toContain("GPL_STRONG_COPYLEFT_DISTRIBUTION");
  });

  it("permissive-only projects are low risk", () => {
    const analysis = analyzeProject({
      licenses: ["MIT", "ISC", "BSD-2-Clause"],
      context: { finalProjectProprietary: true },
    });
    expect(analysis.overallRisk).toBe("LOW");
    expect(analysis.warnings).toEqual([]);
    expect(analysis.sections.attributionRequirements.level).toBe("LOW");
  });

  it("unknown licences require manual review and are reported separately", () => {
    const analysis = analyzeProject({ licenses: ["MIT", "WeirdLicense", "Custom"], projectLicense: "Proprietary" });
    expect(analysis.overallRisk).toBe("MANUAL_REVIEW");
    expect(analysis.sections.unknownLicenses.level).toBe("UNKNOWN");
    expect(analysis.sections.unknownLicenses.inputs).toEqual(["WeirdLicense", "Custom"]);
    expect(analysis.sections.unknownLicenses.ruleIds).toEqual(
      expect.arrayContaining(["UNKNOWN_LICENSE", "CUSTOM_LICENSE_REVIEW"]),
    );
    // unknown licences do not pollute the other sections
    expect(analysis.sections.copyleftRisk.level).toBe("NONE");
  });

  it("a known conflict still outranks unknown licences", () => {
    expect(analyzeProject({ licenses: ["GPL-3.0", "Unknown"], projectLicense: "Proprietary" }).overallRisk).toBe(
      "HIGH",
    );
  });

  it("without a project licence, components are checked against the strongest copyleft licence", () => {
    const analysis = analyzeProject({ licenses: ["MIT", "Apache-2.0", "GPL-3.0"] });
    expect(analysis.effectiveProjectLicense).toBe("GPL-3.0");
    expect(analysis.overallRisk).toBe("MEDIUM");
    expect(analysis.sections.copyleftRisk.level).not.toBe("HIGH");
  });

  it("Apache-2.0 combined with GPL-2.0-only is high risk", () => {
    const analysis = analyzeProject({ licenses: ["Apache-2.0", "GPL-2.0-only"] });
    expect(analysis.effectiveProjectLicense).toBe("GPL-2.0");
    expect(analysis.overallRisk).toBe("HIGH");
    expect(analysis.warnings.find((w) => w.input === "Apache-2.0")?.ruleIds).toContain("APACHE_GPL2_INCOMPATIBLE");
  });

  it("network copyleft is surfaced for SaaS", () => {
    const analysis = analyzeProject({
      licenses: ["MIT", "AGPL-3.0"],
      projectLicense: "Proprietary",
      context: { distributed: false, networkUse: true, modified: true },
    });
    expect(analysis.sections.networkCopyleft.level).toBe("HIGH");
    expect(analysis.sections.networkCopyleft.ruleIds).toContain("AGPL_NETWORK_USE");
  });

  it("internal use of GPL code is not high risk", () => {
    const analysis = analyzeProject({ licenses: ["GPL-3.0", "Proprietary"], context: { distributed: false } });
    expect(analysis.overallRisk).not.toBe("HIGH");
  });

  it("deduplicates inputs case-insensitively", () => {
    expect(analyzeProject({ licenses: ["MIT", "mit", " MIT "] }).checks).toHaveLength(1);
  });
});
