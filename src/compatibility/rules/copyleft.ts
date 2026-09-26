import type { Rule, RuleContext, RuleFinding } from "../../types/index.js";
import { SOURCES } from "../../licenses/sources/index.js";
import { hasStrongCopyleft, isPermissiveOrPublicDomain, rulePrefix } from "../../utils/index.js";
import { findPairException } from "../exceptions/index.js";

/** Component A has strong or network copyleft (GPL-2.0, GPL-3.0, AGPL-3.0). */
function strongComponent(ctx: RuleContext): RuleFinding | null {
  const { a, b } = ctx;
  const prefix = rulePrefix(a);

  if (ctx.integration === "SEPARATE_PROGRAM") {
    return {
      ruleId: `${prefix}_SEPARATE_PROGRAM`,
      severity: ctx.distributed ? "CONDITION" : "INFO",
      dimensions: ["copyleft", "sourceDisclosure"],
      message: `Where the ${a.id} component runs as a separate program (communicating at arm's length, e.g. via pipes, sockets or command-line invocation) rather than being linked into one program, ${a.id} generally covers only that program. Whether two parts form one program depends on how they are combined and exchange data.`,
      obligations: ctx.distributed
        ? [`Provide the ${a.id} program's source and licence when distributing it alongside your software.`]
        : [],
      risks: [
        "Tight integration (shared data structures, linking, plugins loaded into the same process) may make them a single combined work.",
      ],
      sources: [
        {
          ...SOURCES.gplFaq,
          title: "GNU Project: GPL FAQ – mere aggregation",
          url: "https://www.gnu.org/licenses/gpl-faq.html#MereAggregation",
        },
      ],
      confidence: "MEDIUM",
    };
  }

  if (!ctx.distributed) {
    // Network use without distribution is evaluated by the network-use rule (AGPL/GPL SaaS).
    if (ctx.networkUse) return null;
    return {
      ruleId: `${prefix}_NOT_DISTRIBUTED`,
      severity: "INFO",
      dimensions: ["copyleft", "distribution", "proprietaryUse"],
      message: `${a.id} conditions on the combined work are triggered when the software is distributed (conveyed). Running or modifying it privately without distributing it does not trigger them.`,
      risks: [
        `If the software is later distributed (including to customers, contractors outside your organisation, or as downloadable/client-side code), the ${a.id} copyleft conditions apply.`,
      ],
      sources: [SOURCES.gplFaqPrivateUse],
    };
  }

  if (a.id === b.id && ctx.aNormalized.orLater === ctx.bNormalized.orLater) {
    return {
      ruleId: `${prefix}_SAME_LICENSE`,
      severity: "INFO",
      dimensions: ["copyleft", "sourceDisclosure"],
      message: `Component and project use the same licence (${a.id}); the combined work is distributed under ${a.id}.`,
      obligations: [`Provide Corresponding Source for the whole work under ${a.id} when distributing.`],
    };
  }

  if (b.category === "PROPRIETARY" || ctx.finalProjectProprietary) {
    return {
      ruleId: `${prefix}_STRONG_COPYLEFT_DISTRIBUTION`,
      severity: "CONFLICT",
      dimensions: ["copyleft", "proprietaryUse", "distribution", "sourceDisclosure"],
      message: `If a work based on ${a.id} code is distributed, the whole work must be licensed under ${a.id} with its complete source available. That is generally incompatible with distributing the project under proprietary terms.`,
      risks: [
        `Distributing a proprietary product that incorporates ${a.id} code can expose the distributor to copyright infringement claims.`,
      ],
      recommendations: [
        `Replace the ${a.id} component, obtain a commercial licence from the copyright holder if one is offered, or release the combined work under ${a.id}.`,
        "Review the actual licence text and how the code is combined before distributing.",
      ],
      sources: [SOURCES.gplFaq],
    };
  }

  if (b.category !== "OPEN_SOURCE" && b.category !== "PUBLIC_DOMAIN_EQUIVALENT") {
    return {
      ruleId: `${prefix}_INCOMPATIBLE_PROJECT_LICENSE`,
      severity: "CONFLICT",
      dimensions: ["copyleft", "distribution"],
      message: `${a.id} does not allow the combined work to be distributed under ${b.id}, which adds restrictions ${a.id} does not permit.`,
      sources: [SOURCES.fsfLicenseList],
    };
  }

  if (b.fsfGplCompatible === false) {
    return {
      ruleId: `${prefix}_INCOMPATIBLE_PROJECT_LICENSE`,
      severity: "CONFLICT",
      dimensions: ["copyleft", "distribution"],
      message: `The FSF lists ${b.id} as incompatible with the GNU GPL, so ${a.id} code and ${b.id} code generally cannot be combined into one distributed work.`,
      sources: [SOURCES.fsfLicenseList],
    };
  }

  return {
    ruleId: "COPYLEFT_RELICENSE_REQUIRED",
    severity: "WARNING",
    dimensions: ["copyleft", "distribution", "sourceDisclosure"],
    message: `Using ${a.id} code in a project under ${b.id} is one-directional: ${b.id} code can go into a work under ${a.id}, but a distributed work containing ${a.id} code must as a whole be licensed under ${a.id}. Your own files may keep ${b.id}, yet the project can no longer be distributed under ${b.id} alone.`,
    obligations: [`Distribute the combined work under ${a.id} with complete source code.`],
    recommendations: [
      `If the project must stay ${b.id}-only, replace the ${a.id} component or keep it as a separate program.`,
    ],
    sources: [SOURCES.gplFaq, SOURCES.fsfLicenseList],
  };
}

/** Component A has weak (LGPL, EPL-2.0) or file-level (MPL-2.0, CDDL-1.0) copyleft. */
function limitedComponent(ctx: RuleContext): RuleFinding | RuleFinding[] | null {
  const { a } = ctx;
  const prefix = rulePrefix(a);

  if (!ctx.distributed) {
    return {
      ruleId: `${prefix}_NOT_DISTRIBUTED`,
      severity: "INFO",
      dimensions: ["copyleft", "distribution"],
      message: `${a.id} copyleft conditions are triggered by distribution; this scenario does not include distribution.`,
    };
  }

  if (a.id === "LGPL-2.1" || a.id === "LGPL-3.0") {
    const section = a.id === "LGPL-3.0" ? "section 4" : "section 6";
    const common = {
      dimensions: ["copyleft", "sourceDisclosure", "proprietaryUse"] as RuleFinding["dimensions"],
      sources: [SOURCES.lgplFaqLinking],
    };
    const findings: RuleFinding[] = [];

    if (ctx.integration === "SOURCE_INCLUSION") {
      findings.push({
        ...common,
        ruleId: "LGPL_SOURCE_INCLUSION",
        severity: "WARNING",
        message: `Copying ${a.id} source code into your own files makes those files part of a work based on the library, which must then be distributed under ${a.id}. The linking exception for separate applications does not cover merged source.`,
        recommendations: [
          `Use the ${a.id} library as a separate, replaceable library instead of copying its source into your code.`,
        ],
      });
    } else if (ctx.integration === "STATIC_LINK") {
      findings.push({
        ...common,
        ruleId: "LGPL_STATIC_LINKING",
        severity: "CONDITION",
        message: `Statically linking an ${a.id} library into a separately licensed application is permitted under ${section} only if users can relink the application with a modified version of the library, typically by providing object files or source of the application.`,
        obligations: [
          "Provide object files (or source) of your application so users can relink it with a modified library.",
          `Include the ${a.id} licence text and a notice that the library is used.`,
          ...(a.id === "LGPL-2.1" ? ["Permit reverse engineering for debugging such modifications."] : []),
        ],
      });
    } else {
      findings.push({
        ...common,
        ruleId: "LGPL_LIBRARY_LINKING",
        severity: "CONDITION",
        message: `An application that uses an ${a.id} library may be distributed under its own terms, including proprietary terms, when ${section} is met: typically by using the library as a replaceable shared library, giving notice of its use, and including the licence.`,
        obligations: [
          `Include the ${a.id} licence text${a.id === "LGPL-3.0" ? " and the GPL-3.0 text" : ""} and a notice that the library is used.`,
          "Allow users to replace the library with a modified version (e.g. dynamic linking).",
          `Provide the source of the ${a.id} library you distribute.`,
          ...(a.id === "LGPL-2.1" ? ["Permit reverse engineering for debugging such modifications."] : []),
        ],
        confidence: ctx.integration === "UNSPECIFIED" ? "MEDIUM" : "HIGH",
        recommendations:
          ctx.integration === "UNSPECIFIED"
            ? [
                "Confirm whether the library is linked dynamically, statically, or copied into your source; the conditions differ.",
              ]
            : [],
      });
    }

    if (ctx.modified) {
      findings.push({
        ...common,
        ruleId: "LGPL_MODIFIED_LIBRARY",
        severity: "CONDITION",
        message: `Modifications to the ${a.id} library itself must be distributed under ${a.id} with source code, even when the application using it stays proprietary.`,
        obligations: [`Release the source of your modifications to the ${a.id} library under ${a.id}.`],
      });
    }
    return findings;
  }

  if (a.id === "MPL-2.0" || a.id === "CDDL-1.0") {
    return {
      ruleId: `${prefix}_FILE_LEVEL_COPYLEFT`,
      severity: "CONDITION",
      dimensions: ["copyleft", "sourceDisclosure", "proprietaryUse"],
      message: `${a.id} is file-level copyleft: its files${ctx.modified ? ", including your modifications to them," : ""} must remain under ${a.id} and their source must be made available when distributed. Your own separate files in the larger work may use other terms, including proprietary terms.`,
      obligations: [
        `Make the source of ${a.id}-covered files (and modifications to them) available under ${a.id}.`,
        `Keep ${a.id} notices in covered files.`,
      ],
      risks:
        ctx.integration === "SOURCE_INCLUSION"
          ? [`Code copied from ${a.id} files into your own files becomes ${a.id}-covered.`]
          : [],
      sources: a.id === "MPL-2.0" ? [SOURCES.mplFaq] : [SOURCES.fsfLicenseList],
    };
  }

  if (a.id === "EPL-2.0") {
    return {
      ruleId: "EPL_WEAK_COPYLEFT",
      severity: "CONDITION",
      dimensions: ["copyleft", "sourceDisclosure", "proprietaryUse"],
      message:
        "EPL-2.0 requires source of the EPL-2.0 program and of modifications to it to be available under EPL-2.0 when distributed. Separate modules that are not derivative works of it may be licensed under other terms.",
      obligations: ["Make the source of EPL-2.0 code and your modifications to it available under EPL-2.0."],
      sources: [SOURCES.eplFaq],
      confidence: "MEDIUM",
    };
  }
  return null;
}

/**
 * Directional copyleft evaluation: component A used inside project B.
 * Pair exceptions (GNU version issues, Apache/GPL, MPL secondary licences, ...) take precedence.
 */
export const copyleftRule: Rule = (ctx) => {
  const { a, b } = ctx;
  if (a.category === "UNKNOWN" || b.category === "UNKNOWN") return null;
  if (a.category === "PROPRIETARY" || a.category === "SOURCE_AVAILABLE") return null; // see proprietary/source-available rules

  const exception = findPairException(ctx);
  if (exception) return exception;

  const findings: RuleFinding[] = [];
  const componentFinding = hasStrongCopyleft(a)
    ? strongComponent(ctx)
    : a.copyleft !== "NONE"
      ? limitedComponent(ctx)
      : null;
  if (componentFinding) findings.push(...[componentFinding].flat());

  // Project-side copyleft: a strong-copyleft project needs every distributed component to be compatible.
  if (hasStrongCopyleft(b) && b.category === "OPEN_SOURCE" && a.id !== b.id) {
    if (isPermissiveOrPublicDomain(a)) {
      findings.push({
        ruleId: "PERMISSIVE_INTO_COPYLEFT",
        severity: "INFO",
        dimensions: ["copyleft"],
        message: `${a.id} code can generally be included in a project under ${b.id}; the combined work is distributed under ${b.id} while the ${a.id} notices for that code are retained.`,
        sources: [SOURCES.fsfLicenseList],
      });
    } else if (!hasStrongCopyleft(a) && a.fsfGplCompatible === false && ctx.distributed) {
      findings.push({
        ruleId: "COMPONENT_INCOMPATIBLE_WITH_PROJECT_COPYLEFT",
        severity: "CONFLICT",
        dimensions: ["copyleft", "distribution"],
        message: `A distributed ${b.id} work must be licensed as a whole under ${b.id}, and ${a.id} is listed by the FSF as incompatible with the GNU GPL.`,
        sources: [SOURCES.fsfLicenseList],
      });
    }
  }

  return findings;
};
