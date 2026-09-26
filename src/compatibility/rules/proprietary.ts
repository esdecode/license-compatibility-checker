import type { Rule, RuleFinding } from "../../types/index.js";
import { SOURCES } from "../../licenses/sources/index.js";
import { hasStrongCopyleft, isPermissiveOrPublicDomain } from "../../utils/index.js";

/**
 * PROPRIETARY_COMPONENT_TERMS, PROPRIETARY_INTO_COPYLEFT, PERMISSIVE_PROPRIETARY_USE,
 * SOURCE_AVAILABLE_COMPONENT, SOURCE_AVAILABLE_INTO_OPEN_SOURCE, SSPL_COPYLEFT_DISTRIBUTION.
 */
export const proprietaryRule: Rule = (ctx) => {
  const { a, b } = ctx;
  if (a.category === "UNKNOWN" || b.category === "UNKNOWN") return null;
  const findings: RuleFinding[] = [];
  const closed = b.category === "PROPRIETARY" || ctx.finalProjectProprietary;

  if (a.category === "PROPRIETARY") {
    findings.push({
      ruleId: "PROPRIETARY_COMPONENT_TERMS",
      severity: "REVIEW",
      dimensions: ["commercialUse", "modification", "distribution", "proprietaryUse"],
      message:
        "The component is under proprietary terms. Whether it may be used, modified, redistributed, resold or white-labelled depends entirely on the specific licence agreement.",
      recommendations: [
        "Read the component's licence agreement for use, modification, redistribution, sublicensing and transfer rights.",
        "Confirm the licence covers your number of end products, users or deployments.",
      ],
      confidence: "LOW",
    });
    if (hasStrongCopyleft(b) && b.category === "OPEN_SOURCE" && ctx.distributed) {
      findings.push({
        ruleId: "PROPRIETARY_INTO_COPYLEFT",
        severity: "CONFLICT",
        dimensions: ["copyleft", "distribution", "proprietaryUse"],
        message: `A distributed ${b.id} work must be licensed as a whole under ${b.id} with complete source code. Proprietary components normally cannot be offered on those terms.`,
        recommendations: [
          "Keep the proprietary component as a separate program, or obtain permission to license it under compatible terms.",
        ],
        sources: [SOURCES.gplFaq],
      });
    }
    return findings;
  }

  if (a.category === "SOURCE_AVAILABLE") {
    findings.push({
      ruleId: "SOURCE_AVAILABLE_COMPONENT",
      severity: "REVIEW",
      dimensions: ["commercialUse", "proprietaryUse"],
      message: `${a.id} is a source-available licence, not an open-source licence. The source can be read and used within the licence's restrictions: ${a.restrictions.join("; ")}.`,
      recommendations: [`Review the ${a.id} restrictions against your exact use case.`],
      sources: [...a.sources],
      confidence: "MEDIUM",
    });

    if (ctx.distributed && (b.category === "OPEN_SOURCE" || b.category === "PUBLIC_DOMAIN_EQUIVALENT")) {
      findings.push({
        ruleId: "SOURCE_AVAILABLE_INTO_OPEN_SOURCE",
        severity: hasStrongCopyleft(b) ? "CONFLICT" : "WARNING",
        dimensions: ["distribution", "copyleft"],
        message: hasStrongCopyleft(b)
          ? `${b.id} forbids adding further restrictions, and ${a.id} carries restrictions ${b.id} does not allow; the two generally cannot be combined into one distributed work.`
          : `The ${a.id} code keeps its own restrictions, so a project containing it cannot be offered entirely under ${b.id}; recipients would not receive ${b.id} freedoms for that part.`,
        sources: [SOURCES.fsfLicenseList],
      });
    }

    if (a.id === "SSPL-1.0" && ctx.distributed && closed) {
      findings.push({
        ruleId: "SSPL_COPYLEFT_DISTRIBUTION",
        severity: "CONFLICT",
        dimensions: ["copyleft", "sourceDisclosure", "proprietaryUse"],
        message:
          "SSPL-1.0 is based on AGPL-3.0: a conveyed work based on it must be licensed under SSPL-1.0 with Corresponding Source, which is generally incompatible with proprietary distribution.",
        sources: [...a.sources],
      });
    }
    return findings;
  }

  if (closed && isPermissiveOrPublicDomain(a)) {
    findings.push({
      ruleId: "PERMISSIVE_PROPRIETARY_USE",
      severity: "INFO",
      dimensions: ["proprietaryUse"],
      message: `${a.id} generally allows the code to be included in proprietary software without releasing your source code${a.attributionRequired ? ", provided its notices are kept" : ""}.`,
    });
  }

  return findings;
};
