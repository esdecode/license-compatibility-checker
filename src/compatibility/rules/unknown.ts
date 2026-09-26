import type { Rule, RuleFinding } from "../../types/index.js";
import { DIMENSION_KEYS } from "../../types/index.js";
import { SOURCES } from "../../licenses/sources/index.js";
import { isGnu, licenseLabel } from "../../utils/index.js";

/** UNKNOWN_LICENSE / CUSTOM_LICENSE_REVIEW: licences whose terms cannot be evaluated. */
export const unknownLicenseRule: Rule = (ctx) => {
  const findings: RuleFinding[] = [];
  const sides = [
    { role: "component", license: ctx.a, normalized: ctx.aNormalized },
    { role: "project", license: ctx.b, normalized: ctx.bNormalized },
  ] as const;

  for (const { role, license, normalized } of sides) {
    if (license.id === "Unknown") {
      findings.push({
        ruleId: "UNKNOWN_LICENSE",
        severity: "UNKNOWN",
        dimensions: [...DIMENSION_KEYS],
        message: normalized.recognized
          ? `The ${role} licence is unknown, so no compatibility conclusion can be drawn.`
          : `The ${role} licence ${licenseLabel(license, normalized)} is not recognized, so no compatibility conclusion can be drawn.`,
        risks: [
          `Without an identified licence for the ${role}, no right to use, modify or distribute it should be assumed.`,
        ],
        recommendations: [
          `Identify the exact ${role} licence (for example its SPDX identifier or LICENSE file) and run the check again.`,
        ],
        sources: [SOURCES.spdxLicenseList],
        confidence: "LOW",
      });
    } else if (license.id === "Custom") {
      findings.push({
        ruleId: "CUSTOM_LICENSE_REVIEW",
        severity: "REVIEW",
        dimensions: [...DIMENSION_KEYS],
        message: `The ${role} uses a custom or modified licence${normalized.input.trim() && normalized.input.trim().toLowerCase() !== "custom" ? ` ("${normalized.input.trim()}")` : ""}; its terms must be read individually.`,
        recommendations: [`Review the full ${role} licence text before relying on this result.`],
        confidence: "LOW",
      });
    } else if (normalized.versionOptionUnspecified && isGnu(license)) {
      findings.push({
        ruleId: "GNU_VERSION_OPTION_UNSPECIFIED",
        severity: "INFO",
        dimensions: ["copyleft"],
        message: `${license.id} was given without "-only" or "-or-later" and is treated as ${license.id}-only. If the licensor allows "any later version", compatibility with later GNU licences may differ.`,
        recommendations: [`Check the ${role}'s licence notice for "or (at your option) any later version".`],
        sources: [SOURCES.spdxLicenseList],
      });
    }
  }
  return findings;
};
