import { describe, expect, it } from "vitest";
import { analyzeSourceCodeAcquisition } from "../../src/index.js";
import type { AcquisitionInput } from "../../src/index.js";

const base: AcquisitionInput = {
  mainProjectLicense: "Proprietary",
  thirdPartyLicenses: ["MIT"],
  commercialUse: true,
  saas: false,
  redistribution: false,
  modification: true,
  whiteLabel: false,
  resale: false,
};

const topics = (input: AcquisitionInput) => analyzeSourceCodeAcquisition(input).sellerQuestions.map((q) => q.topic);

describe("analyzeSourceCodeAcquisition", () => {
  it("returns all report sections", () => {
    const report = analyzeSourceCodeAcquisition(base);
    expect(Object.keys(report.sections).sort()).toEqual(
      [
        "commercialUse",
        "copyleftRisk",
        "ownershipRisk",
        "redistribution",
        "saasNetworkUse",
        "thirdPartyComponents",
        "unknownComponents",
        "whiteLabelResale",
      ].sort(),
    );
  });

  it("does not claim to verify ownership", () => {
    const report = analyzeSourceCodeAcquisition(base);
    expect(report.scopeNote).toMatch(/does not verify/i);
    expect(report.sections.ownershipRisk.level).not.toBe("NONE");
    expect(report.sections.ownershipRisk.summary).toMatch(/cannot be verified/i);
  });

  it("GPL-3.0 third-party code with redistribution of a proprietary product is high risk", () => {
    const report = analyzeSourceCodeAcquisition({
      ...base,
      thirdPartyLicenses: ["MIT", "GPL-3.0"],
      redistribution: true,
    });
    expect(report.overallRisk).toBe("HIGH");
    expect(report.sections.copyleftRisk.level).toBe("HIGH");
    expect(report.sections.thirdPartyComponents.inputs).toContain("GPL-3.0");
    expect(report.sections.thirdPartyComponents.ruleIds).toContain("GPL_STRONG_COPYLEFT_DISTRIBUTION");
  });

  it("modified AGPL-3.0 in a SaaS is flagged in the SaaS section", () => {
    const report = analyzeSourceCodeAcquisition({ ...base, thirdPartyLicenses: ["AGPL-3.0"], saas: true });
    expect(report.sections.saasNetworkUse.level).toBe("HIGH");
    expect(report.sections.saasNetworkUse.ruleIds).toContain("AGPL_NETWORK_USE");
  });

  it("an unknown main licence is a high ownership risk", () => {
    const report = analyzeSourceCodeAcquisition({ ...base, mainProjectLicense: "" });
    expect(report.sections.ownershipRisk.level).toBe("HIGH");
  });

  it("missing third-party licences are not treated as 'none'", () => {
    const report = analyzeSourceCodeAcquisition({ ...base, thirdPartyLicenses: [] });
    expect(report.sections.thirdPartyComponents.level).toBe("UNKNOWN");
    expect(report.overallRisk).toBe("MANUAL_REVIEW");
  });

  it("unknown components are reported and asked about", () => {
    const report = analyzeSourceCodeAcquisition({ ...base, thirdPartyLicenses: ["MIT", "some-random-license"] });
    expect(report.sections.unknownComponents.level).toBe("UNKNOWN");
    expect(report.sections.unknownComponents.inputs).toContain("some-random-license");
    expect(report.sellerQuestions.map((q) => q.topic)).toContain("UNKNOWN_COMPONENTS");
  });

  it("asks the core seller questions", () => {
    expect(topics(base)).toEqual(
      expect.arrayContaining([
        "MAIN_LICENSE_TERMS",
        "COPYRIGHT_OWNERSHIP",
        "COPIED_THIRD_PARTY_CODE",
        "UNDOCUMENTED_DEPENDENCIES",
        "COPYLEFT_COMPONENTS",
        "COMMERCIAL_PLUGINS",
        "LICENSE_TRANSFERABILITY",
        "IMAGES",
        "FONTS",
        "ICONS",
        "DATASETS",
        "API_INTEGRATIONS",
        "SOURCE_AVAILABLE_COMPONENTS",
      ]),
    );
  });

  it("adds redistribution and white-label questions only when relevant", () => {
    expect(topics(base)).not.toContain("REDISTRIBUTION_RIGHTS");
    expect(topics(base)).not.toContain("WHITE_LABEL_RIGHTS");
    expect(topics({ ...base, redistribution: true })).toContain("REDISTRIBUTION_RIGHTS");
    expect(topics({ ...base, whiteLabel: true })).toContain("WHITE_LABEL_RIGHTS");
    expect(topics({ ...base, resale: true })).toEqual(
      expect.arrayContaining(["REDISTRIBUTION_RIGHTS", "WHITE_LABEL_RIGHTS"]),
    );
  });

  it("white label of proprietary code depends on the seller's terms", () => {
    const report = analyzeSourceCodeAcquisition({ ...base, whiteLabel: true });
    expect(report.sections.whiteLabelResale.level).toBe("UNKNOWN");
  });

  it("unplanned uses are reported as not applicable", () => {
    const report = analyzeSourceCodeAcquisition(base);
    expect(report.sections.redistribution.level).toBe("NONE");
    expect(report.sections.saasNetworkUse.level).toBe("NONE");
    expect(report.sections.whiteLabelResale.level).toBe("NONE");
  });

  it("an MIT project with MIT dependencies is not high risk", () => {
    const report = analyzeSourceCodeAcquisition({ ...base, mainProjectLicense: "MIT", redistribution: true });
    expect(report.overallRisk).toBe("MEDIUM"); // ownership cannot be verified
    expect(report.sections.copyleftRisk.level).toBe("NONE");
    expect(report.sections.ownershipRisk.summary).toMatch(/exclusive/i);
  });
});
