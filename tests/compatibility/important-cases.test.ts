import { describe, expect, it } from "vitest";
import { check, ruleIds } from "../helpers.js";

describe("permissive licences in proprietary software", () => {
  it("MIT -> Proprietary is generally compatible with an attribution obligation", () => {
    const result = check("MIT", "Proprietary", "PROPRIETARY_SOFTWARE");
    expect(result.status).toBe("GENERALLY_COMPATIBLE");
    expect(ruleIds(result)).toContain("MIT_ATTRIBUTION");
    expect(ruleIds(result)).toContain("PERMISSIVE_PROPRIETARY_USE");
    expect(result.obligations.join(" ")).toMatch(/copyright notice/i);
    expect(result.dimensions.attribution.status).toBe("OBLIGATIONS");
    expect(result.dimensions.proprietaryUse.status).toBe("OK");
    expect(result.confidence).toBe("HIGH");
  });

  it("Apache-2.0 -> Proprietary is generally compatible and surfaces patent and NOTICE terms", () => {
    const result = check("Apache-2.0", "Proprietary", "PROPRIETARY_SOFTWARE", { modified: true });
    expect(result.status).toBe("GENERALLY_COMPATIBLE");
    expect(ruleIds(result)).toEqual(
      expect.arrayContaining([
        "APACHE_PATENT_NOTICE",
        "APACHE_NOTICE_FILE",
        "APACHE_ATTRIBUTION",
        "APACHE_STATE_CHANGES",
      ]),
    );
    expect(result.dimensions.patents.summary).toMatch(/patent litigation/i);
  });
});

describe("GPL-3.0", () => {
  it("GPL-3.0 -> Proprietary distributed application is likely incompatible", () => {
    const result = check("GPL-3.0", "Proprietary", "PROPRIETARY_SOFTWARE");
    expect(result.status).toBe("LIKELY_INCOMPATIBLE");
    expect(ruleIds(result)).toContain("GPL_STRONG_COPYLEFT_DISTRIBUTION");
    expect(result.dimensions.copyleft.status).toBe("CONFLICT");
    expect(result.recommendations.join(" ")).toMatch(/actual licence/i);
  });

  it("GPL-3.0 -> internal/private use is generally compatible", () => {
    const result = check("GPL-3.0", "Proprietary", "INTERNAL_USE");
    expect(result.status).toBe("GENERALLY_COMPATIBLE");
    expect(ruleIds(result)).toContain("GPL_NOT_DISTRIBUTED");
    expect(result.risks.join(" ")).toMatch(/later distributed/i);
  });

  it("GPL-3.0 -> SaaS without distribution is compatible with conditions and warns about client-side code", () => {
    const result = check("GPL-3.0", "Proprietary", "SAAS");
    expect(result.status).toBe("COMPATIBLE_WITH_CONDITIONS");
    expect(ruleIds(result)).toContain("GPL_SAAS_NO_DISTRIBUTION");
    expect(ruleIds(result)).not.toContain("GPL_STRONG_COPYLEFT_DISTRIBUTION");
    expect(result.risks.join(" ")).toMatch(/browsers|client-side/i);
  });

  it("GPL-3.0 -> SaaS that also ships a downloadable app is likely incompatible", () => {
    const result = check("GPL-3.0", "Proprietary", "SAAS", { distributed: true });
    expect(result.status).toBe("LIKELY_INCOMPATIBLE");
  });
});

describe("AGPL-3.0", () => {
  it("modified AGPL-3.0 in a proprietary SaaS is likely incompatible", () => {
    const result = check("AGPL-3.0", "Proprietary", "SAAS", { modified: true });
    expect(result.status).toBe("LIKELY_INCOMPATIBLE");
    expect(ruleIds(result)).toContain("AGPL_NETWORK_USE");
    expect(result.dimensions.networkUse.status).toBe("CONFLICT");
  });

  it("unmodified AGPL-3.0 in a proprietary SaaS is a potential conflict, not a clean pass", () => {
    const result = check("AGPL-3.0", "Proprietary", "SAAS");
    expect(result.status).toBe("POTENTIAL_CONFLICT");
    expect(result.confidence).not.toBe("HIGH");
  });

  it("AGPL-3.0 in an AGPL-3.0 SaaS is compatible with source-offer conditions", () => {
    const result = check("AGPL-3.0", "AGPL-3.0", "SAAS", { modified: true });
    expect(result.status).toBe("COMPATIBLE_WITH_CONDITIONS");
    expect(result.obligations.join(" ")).toMatch(/network/i);
  });
});

describe("LGPL", () => {
  it("LGPL-3.0 library -> proprietary application requires the relinking conditions", () => {
    const result = check("LGPL-3.0", "Proprietary", "DEPENDENCY");
    expect(result.status).toBe("COMPATIBLE_WITH_CONDITIONS");
    expect(ruleIds(result)).toContain("LGPL_LIBRARY_LINKING");
    expect(result.confidence).toBe("MEDIUM"); // integration mode unspecified
    expect(result.obligations.join(" ")).toMatch(/replace the library/i);
  });

  it("dynamic linking raises confidence", () => {
    expect(check("LGPL-3.0", "Proprietary", "DEPENDENCY", { integration: "DYNAMIC_LINK" }).confidence).toBe("HIGH");
  });

  it("static linking needs object files for relinking", () => {
    const result = check("LGPL-2.1", "Proprietary", "DEPENDENCY", { integration: "STATIC_LINK" });
    expect(ruleIds(result)).toContain("LGPL_STATIC_LINKING");
    expect(result.obligations.join(" ")).toMatch(/object files/i);
  });

  it("modified LGPL library must be released under LGPL", () => {
    const result = check("LGPL-3.0", "Proprietary", "MODIFY");
    expect(ruleIds(result)).toEqual(expect.arrayContaining(["LGPL_LIBRARY_LINKING", "LGPL_MODIFIED_LIBRARY"]));
    expect(result.status).toBe("COMPATIBLE_WITH_CONDITIONS");
  });

  it("copying LGPL source into proprietary files is a potential conflict", () => {
    const result = check("LGPL-3.0", "Proprietary", "INCLUDE_SOURCE");
    expect(result.status).toBe("POTENTIAL_CONFLICT");
    expect(ruleIds(result)).toContain("LGPL_SOURCE_INCLUSION");
  });
});

describe("MPL-2.0 file-level copyleft", () => {
  it("MPL-2.0 -> Proprietary is compatible with file-level conditions", () => {
    const result = check("MPL-2.0", "Proprietary", "PROPRIETARY_SOFTWARE");
    expect(result.status).toBe("COMPATIBLE_WITH_CONDITIONS");
    expect(ruleIds(result)).toContain("MPL_FILE_LEVEL_COPYLEFT");
    expect(result.dimensions.copyleft.summary).toMatch(/file-level/i);
  });

  it("MPL-2.0 -> GPL-3.0 uses the Secondary License provision", () => {
    const result = check("MPL-2.0", "GPL-3.0", "DISTRIBUTE_BINARY");
    expect(result.status).toBe("COMPATIBLE_WITH_CONDITIONS");
    expect(ruleIds(result)).toContain("MPL_SECONDARY_LICENSE");
    expect(result.risks.join(" ")).toMatch(/Incompatible With Secondary Licenses/);
  });
});

describe("Apache-2.0 and GPL versions", () => {
  it("GPL-2.0 -> Apache-2.0 project is likely incompatible", () => {
    const result = check("GPL-2.0", "Apache-2.0", "DISTRIBUTE_BINARY");
    expect(result.status).toBe("LIKELY_INCOMPATIBLE");
    expect(ruleIds(result)).toContain("APACHE_GPL2_INCOMPATIBLE");
  });

  it("GPL-3.0 -> Apache-2.0 project is a potential conflict (whole work must become GPL-3.0)", () => {
    const result = check("GPL-3.0", "Apache-2.0", "DISTRIBUTE_BINARY");
    expect(result.status).toBe("POTENTIAL_CONFLICT");
    expect(ruleIds(result)).toContain("COPYLEFT_RELICENSE_REQUIRED");
  });

  it("Apache-2.0 -> GPL-3.0 project is compatible with conditions", () => {
    const result = check("Apache-2.0", "GPL-3.0", "DISTRIBUTE_BINARY");
    expect(result.status).toBe("COMPATIBLE_WITH_CONDITIONS");
    expect(ruleIds(result)).toContain("APACHE_GPL3_COMPATIBLE");
  });

  it("Apache-2.0 -> GPL-2.0-only is likely incompatible, GPL-2.0-or-later is not", () => {
    expect(check("Apache-2.0", "GPL-2.0-only", "DISTRIBUTE_BINARY").status).toBe("LIKELY_INCOMPATIBLE");
    expect(check("Apache-2.0", "GPL-2.0-or-later", "DISTRIBUTE_BINARY").status).toBe("COMPATIBLE_WITH_CONDITIONS");
  });

  it("GPL-2.0-only cannot be combined into GPL-3.0, GPL-2.0-or-later can", () => {
    expect(check("GPL-2.0-only", "GPL-3.0", "DISTRIBUTE_BINARY").status).toBe("LIKELY_INCOMPATIBLE");
    expect(check("GPL-2.0-or-later", "GPL-3.0", "DISTRIBUTE_BINARY").status).toBe("COMPATIBLE_WITH_CONDITIONS");
  });

  it("plain GPL-2.0 is treated as -only and flagged", () => {
    const result = check("GPL-2.0", "GPL-3.0", "DISTRIBUTE_BINARY");
    expect(result.status).toBe("LIKELY_INCOMPATIBLE");
    expect(ruleIds(result)).toContain("GNU_VERSION_OPTION_UNSPECIFIED");
  });

  it("GPL-3.0 and AGPL-3.0 may be combined under section 13", () => {
    expect(check("GPL-3.0", "AGPL-3.0", "DISTRIBUTE_BINARY").status).toBe("COMPATIBLE_WITH_CONDITIONS");
    expect(check("AGPL-3.0", "GPL-3.0", "DISTRIBUTE_BINARY").status).toBe("POTENTIAL_CONFLICT");
  });

  it("LGPL-2.1 -> GPL-2.0 is compatible, LGPL-3.0 -> GPL-2.0-only is not", () => {
    expect(check("LGPL-2.1", "GPL-2.0", "DISTRIBUTE_BINARY").status).toBe("COMPATIBLE_WITH_CONDITIONS");
    expect(check("LGPL-3.0", "GPL-2.0", "DISTRIBUTE_BINARY").status).toBe("LIKELY_INCOMPATIBLE");
  });

  it("CDDL-1.0 -> GPL is likely incompatible; EPL-2.0 -> GPL needs manual review", () => {
    expect(check("CDDL-1.0", "GPL-3.0", "DISTRIBUTE_BINARY").status).toBe("LIKELY_INCOMPATIBLE");
    expect(check("EPL-2.0", "GPL-3.0", "DISTRIBUTE_BINARY").status).toBe("MANUAL_REVIEW_REQUIRED");
  });
});

describe("unknown, custom and proprietary components", () => {
  it("Unknown -> MIT is UNKNOWN", () => {
    const result = check("Unknown", "MIT", "DEPENDENCY");
    expect(result.status).toBe("UNKNOWN");
    expect(result.confidence).toBe("LOW");
    expect(ruleIds(result)).toContain("UNKNOWN_LICENSE");
  });

  it("an unrecognized licence string is UNKNOWN and reported as unrecognized", () => {
    const result = check("Totally-Made-Up-1.0", "MIT", "DEPENDENCY");
    expect(result.status).toBe("UNKNOWN");
    expect(result.diagnostics.normalized.a.recognized).toBe(false);
    expect(result.explanation.join(" ")).toMatch(/not recognized/);
  });

  it("Custom -> Proprietary requires manual review", () => {
    const result = check("Custom", "Proprietary", "PROPRIETARY_SOFTWARE");
    expect(result.status).toBe("MANUAL_REVIEW_REQUIRED");
    expect(ruleIds(result)).toContain("CUSTOM_LICENSE_REVIEW");
  });

  it("GPL with an exception is treated as custom, not as plain GPL", () => {
    expect(check("GPL-2.0-with-classpath-exception", "Proprietary", "DEPENDENCY").status).toBe(
      "MANUAL_REVIEW_REQUIRED",
    );
  });

  it("an unknown project licence is UNKNOWN too", () => {
    expect(check("MIT", "no idea", "DEPENDENCY").status).toBe("UNKNOWN");
  });

  it("Proprietary component -> GPL-3.0 project is likely incompatible when distributed", () => {
    const result = check("Proprietary", "GPL-3.0", "DISTRIBUTE_BINARY");
    expect(result.status).toBe("LIKELY_INCOMPATIBLE");
    expect(ruleIds(result)).toEqual(
      expect.arrayContaining(["PROPRIETARY_COMPONENT_TERMS", "PROPRIETARY_INTO_COPYLEFT"]),
    );
  });

  it("Proprietary component -> proprietary project requires review of the agreement", () => {
    expect(check("Proprietary", "Proprietary", "PROPRIETARY_SOFTWARE").status).toBe("MANUAL_REVIEW_REQUIRED");
  });
});

describe("source-available licences", () => {
  it("are not treated as open source", () => {
    const result = check("BUSL-1.1", "Proprietary", "PROPRIETARY_SOFTWARE");
    expect(result.licenseA.category).toBe("SOURCE_AVAILABLE");
    expect(result.status).toBe("MANUAL_REVIEW_REQUIRED");
    expect(ruleIds(result)).toContain("BUSL_ADDITIONAL_USE_GRANT");
  });

  it("SSPL-1.0 in a proprietary SaaS is likely incompatible", () => {
    const result = check("SSPL-1.0", "Proprietary", "SAAS");
    expect(result.status).toBe("LIKELY_INCOMPATIBLE");
    expect(ruleIds(result)).toContain("SSPL_SERVICE_SOURCE");
  });

  it("Elastic-2.0 as a hosted service is flagged", () => {
    const result = check("Elastic-2.0", "Proprietary", "SAAS");
    expect(ruleIds(result)).toContain("ELASTIC_MANAGED_SERVICE");
    expect(["POTENTIAL_CONFLICT", "MANUAL_REVIEW_REQUIRED"]).toContain(result.status);
  });

  it("source-available code cannot go into a GPL-3.0 project", () => {
    expect(check("Elastic-2.0", "GPL-3.0", "DISTRIBUTE_BINARY").status).toBe("LIKELY_INCOMPATIBLE");
  });
});

describe("commercial use is not proprietary use", () => {
  it("GPL-3.0 in commercial (not proprietary) GPL-3.0 software is not incompatible", () => {
    const result = check("GPL-3.0", "GPL-3.0", "COMMERCIAL_SOFTWARE");
    expect(result.status).toBe("GENERALLY_COMPATIBLE");
    expect(result.dimensions.commercialUse.summary).toMatch(/permits commercial use/);
  });

  it("GPL-3.0 can be resold under GPL-3.0", () => {
    const result = check("GPL-3.0", "GPL-3.0", "RESELL");
    expect(result.status).not.toBe("LIKELY_INCOMPATIBLE");
    expect(ruleIds(result)).toContain("RESALE_PERMITTED");
  });

  it("commercial flag alone never produces a conflict for open-source licences", () => {
    for (const license of ["MIT", "Apache-2.0", "BSD-3-Clause", "MPL-2.0", "LGPL-3.0", "GPL-3.0", "AGPL-3.0"]) {
      const result = check(license, license, "COMMERCIAL_SOFTWARE", { commercial: true });
      expect(result.dimensions.commercialUse.status, license).toBe("OK");
    }
  });
});
