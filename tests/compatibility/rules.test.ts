import { describe, expect, it } from "vitest";
import { resolveContext, runRules } from "../../src/compatibility/engine.js";
import {
  attributionRule,
  commercialUseRule,
  copyleftRule,
  distributionRule,
  modificationRule,
  networkUseRule,
  patentsRule,
  proprietaryRule,
  sourceDisclosureRule,
  unknownLicenseRule,
} from "../../src/compatibility/rules/index.js";
import { findPairException } from "../../src/compatibility/exceptions/index.js";
import { statusFromFindings, confidenceFromFindings } from "../../src/compatibility/scoring.js";
import type { CompatibilityInput, Rule } from "../../src/types/index.js";

const ctx = (input: Partial<CompatibilityInput> & Pick<CompatibilityInput, "licenseA" | "licenseB">) =>
  resolveContext({ scenario: "DISTRIBUTE_BINARY", ...input });

const ids = (rule: Rule, input: Parameters<typeof ctx>[0]) =>
  runRules(ctx(input), [rule]).map((finding) => finding.ruleId);

describe("individual rules", () => {
  it("attribution: MIT_ATTRIBUTION only obliges on distribution", () => {
    const distributed = runRules(ctx({ licenseA: "MIT", licenseB: "Proprietary" }), [attributionRule]);
    expect(distributed[0]?.ruleId).toBe("MIT_ATTRIBUTION");
    expect(distributed[0]?.obligations?.length).toBeGreaterThan(0);
    const internal = runRules(ctx({ licenseA: "MIT", licenseB: "Proprietary", scenario: "INTERNAL_USE" }), [
      attributionRule,
    ]);
    expect(internal[0]?.obligations ?? []).toHaveLength(0);
  });

  it("attribution: public-domain licences need none", () => {
    expect(ids(attributionRule, { licenseA: "CC0-1.0", licenseB: "Proprietary" })).toEqual([
      "PUBLIC_DOMAIN_NO_ATTRIBUTION",
    ]);
    expect(ids(attributionRule, { licenseA: "Unlicense", licenseB: "Proprietary" })).toEqual([
      "PUBLIC_DOMAIN_NO_ATTRIBUTION",
    ]);
  });

  it("attribution: BSD-3-Clause adds the no-endorsement clause", () => {
    expect(ids(attributionRule, { licenseA: "BSD-3-Clause", licenseB: "Proprietary" })).toContain("BSD_NO_ENDORSEMENT");
  });

  it("attribution: white label keeps notices", () => {
    expect(ids(attributionRule, { licenseA: "MIT", licenseB: "Proprietary", scenario: "WHITE_LABEL" })).toContain(
      "WHITE_LABEL_NOTICES",
    );
  });

  it("commercial-use: permitted for OSI licences, review for BUSL", () => {
    expect(ids(commercialUseRule, { licenseA: "GPL-3.0", licenseB: "GPL-3.0" })).toEqual(["GPL_COMMERCIAL_USE"]);
    expect(ids(commercialUseRule, { licenseA: "BUSL-1.1", licenseB: "Proprietary" })).toEqual([
      "BUSL_ADDITIONAL_USE_GRANT",
    ]);
  });

  it("copyleft: GPL_STRONG_COPYLEFT_DISTRIBUTION and MPL_FILE_LEVEL_COPYLEFT", () => {
    expect(ids(copyleftRule, { licenseA: "GPL-3.0", licenseB: "Proprietary" })).toEqual([
      "GPL_STRONG_COPYLEFT_DISTRIBUTION",
    ]);
    expect(ids(copyleftRule, { licenseA: "MPL-2.0", licenseB: "Proprietary" })).toEqual(["MPL_FILE_LEVEL_COPYLEFT"]);
    expect(ids(copyleftRule, { licenseA: "CDDL-1.0", licenseB: "Proprietary" })).toEqual(["CDDL_FILE_LEVEL_COPYLEFT"]);
    expect(ids(copyleftRule, { licenseA: "EPL-2.0", licenseB: "Proprietary" })).toEqual(["EPL_WEAK_COPYLEFT"]);
  });

  it("copyleft: separate programs are evaluated with lower confidence", () => {
    const findings = runRules(ctx({ licenseA: "GPL-3.0", licenseB: "Proprietary", integration: "SEPARATE_PROGRAM" }), [
      copyleftRule,
    ]);
    expect(findings.map((f) => f.ruleId)).toEqual(["GPL_SEPARATE_PROGRAM"]);
    expect(findings[0]?.confidence).toBe("MEDIUM");
  });

  it("copyleft: permissive into GPL is informational", () => {
    expect(ids(copyleftRule, { licenseA: "MIT", licenseB: "GPL-3.0" })).toEqual(["PERMISSIVE_INTO_COPYLEFT"]);
  });

  it("network-use: AGPL_NETWORK_USE fires only with network use", () => {
    expect(ids(networkUseRule, { licenseA: "AGPL-3.0", licenseB: "Proprietary" })).toEqual([]);
    expect(ids(networkUseRule, { licenseA: "AGPL-3.0", licenseB: "Proprietary", scenario: "SAAS" })).toEqual([
      "AGPL_NETWORK_USE",
    ]);
  });

  it("patents: express grants, exclusions and absence", () => {
    expect(ids(patentsRule, { licenseA: "Apache-2.0", licenseB: "Proprietary" })).toEqual(["APACHE_PATENT_NOTICE"]);
    expect(ids(patentsRule, { licenseA: "MPL-2.0", licenseB: "Proprietary" })).toEqual(["MPL_PATENT_NOTICE"]);
    expect(ids(patentsRule, { licenseA: "GPL-3.0", licenseB: "GPL-3.0" })).toEqual(["GPL_PATENT_NOTICE"]);
    expect(ids(patentsRule, { licenseA: "MIT", licenseB: "Proprietary" })).toEqual(["PATENT_NO_EXPRESS_GRANT"]);
    expect(ids(patentsRule, { licenseA: "CC0-1.0", licenseB: "Proprietary" })).toEqual(["CC0_PATENT_EXCLUSION"]);
  });

  it("proprietary: component terms always require review", () => {
    expect(ids(proprietaryRule, { licenseA: "Proprietary", licenseB: "MIT" })).toEqual(["PROPRIETARY_COMPONENT_TERMS"]);
  });

  it("source-disclosure: scope follows the licence", () => {
    expect(ids(sourceDisclosureRule, { licenseA: "MIT", licenseB: "Proprietary" })).toEqual(["NO_SOURCE_DISCLOSURE"]);
    expect(ids(sourceDisclosureRule, { licenseA: "GPL-3.0", licenseB: "GPL-3.0" })).toEqual(["GPL_SOURCE_DISCLOSURE"]);
  });

  it("modification: state-change notices for Apache-2.0", () => {
    expect(ids(modificationRule, { licenseA: "Apache-2.0", licenseB: "Proprietary", modified: true })).toContain(
      "APACHE_STATE_CHANGES",
    );
    expect(ids(modificationRule, { licenseA: "Apache-2.0", licenseB: "Proprietary" })).toEqual([]);
  });

  it("distribution: white-label trademark notice", () => {
    expect(
      ids(distributionRule, { licenseA: "Apache-2.0", licenseB: "Proprietary", scenario: "WHITE_LABEL" }),
    ).toContain("WHITE_LABEL_TRADEMARK");
  });

  it("unknown: flags unknown and custom licences on either side", () => {
    expect(ids(unknownLicenseRule, { licenseA: "Unknown", licenseB: "Custom" })).toEqual([
      "UNKNOWN_LICENSE",
      "CUSTOM_LICENSE_REVIEW",
    ]);
  });
});

describe("pair exceptions", () => {
  it("returns null for pairs without special handling", () => {
    expect(findPairException(ctx({ licenseA: "MIT", licenseB: "GPL-3.0" }))).toBeNull();
  });

  it("downgrades to INFO when nothing is distributed", () => {
    const findings = findPairException(
      ctx({ licenseA: "Apache-2.0", licenseB: "GPL-2.0-only", scenario: "INTERNAL_USE" }),
    );
    expect(findings?.[0]?.ruleId).toBe("APACHE_GPL2_INCOMPATIBLE");
    expect(findings?.[0]?.severity).toBe("INFO");
  });
});

describe("scoring", () => {
  it("UNKNOWN outranks every other severity, CONFLICT outranks REVIEW", () => {
    const f = (severity: "INFO" | "CONDITION" | "WARNING" | "REVIEW" | "CONFLICT" | "UNKNOWN") => ({
      ruleId: "X",
      severity,
      dimensions: [],
      message: "",
    });
    expect(statusFromFindings([f("CONFLICT"), f("UNKNOWN")])).toBe("UNKNOWN");
    expect(statusFromFindings([f("REVIEW"), f("CONFLICT")])).toBe("LIKELY_INCOMPATIBLE");
    expect(statusFromFindings([f("WARNING"), f("REVIEW")])).toBe("MANUAL_REVIEW_REQUIRED");
    expect(statusFromFindings([f("INFO")])).toBe("GENERALLY_COMPATIBLE");
    expect(statusFromFindings([])).toBe("GENERALLY_COMPATIBLE");
    expect(confidenceFromFindings([f("REVIEW")])).toBe("LOW");
    expect(confidenceFromFindings([f("INFO")])).toBe("HIGH");
  });
});
