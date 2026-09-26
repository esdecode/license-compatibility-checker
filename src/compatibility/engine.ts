import type {
  CompatibilityInput,
  CompatibilityResult,
  CompatibilityStatus,
  DimensionKey,
  DimensionResult,
  IntegrationMode,
  LicenseDefinition,
  Permission,
  Rule,
  RuleContext,
  RuleFinding,
  Scenario,
} from "../types/index.js";
import { DIMENSION_KEYS, SCENARIOS } from "../types/index.js";
import { getLicenseById, normalizeLicense } from "../licenses/index.js";
import { DISCLAIMER, licenseLabel, unique, uniqueSources } from "../utils/index.js";
import { RULES } from "./rules/index.js";
import { confidenceFromFindings, dimensionStatus, SEVERITY_RANK, statusFromFindings } from "./scoring.js";

interface ScenarioDefaults {
  distributed: boolean;
  networkUse: boolean;
  modified: boolean;
  commercial: boolean;
  proprietary: boolean;
  integration: IntegrationMode;
}

/**
 * Scenario defaults. Where a scenario does not determine a fact, the default is the one that
 * surfaces obligations (e.g. distributed: true) rather than hiding them. Explicit input always wins.
 */
export const SCENARIO_DEFAULTS: Readonly<Record<Scenario, ScenarioDefaults>> = {
  DEPENDENCY: {
    distributed: true,
    networkUse: false,
    modified: false,
    commercial: false,
    proprietary: false,
    integration: "UNSPECIFIED",
  },
  INCLUDE_SOURCE: {
    distributed: true,
    networkUse: false,
    modified: false,
    commercial: false,
    proprietary: false,
    integration: "SOURCE_INCLUSION",
  },
  MODIFY: {
    distributed: true,
    networkUse: false,
    modified: true,
    commercial: false,
    proprietary: false,
    integration: "UNSPECIFIED",
  },
  DISTRIBUTE_BINARY: {
    distributed: true,
    networkUse: false,
    modified: false,
    commercial: false,
    proprietary: false,
    integration: "UNSPECIFIED",
  },
  DISTRIBUTE_SOURCE: {
    distributed: true,
    networkUse: false,
    modified: false,
    commercial: false,
    proprietary: false,
    integration: "UNSPECIFIED",
  },
  COMMERCIAL_SOFTWARE: {
    distributed: true,
    networkUse: false,
    modified: false,
    commercial: true,
    proprietary: false,
    integration: "UNSPECIFIED",
  },
  PROPRIETARY_SOFTWARE: {
    distributed: true,
    networkUse: false,
    modified: false,
    commercial: true,
    proprietary: true,
    integration: "UNSPECIFIED",
  },
  SAAS: {
    distributed: false,
    networkUse: true,
    modified: false,
    commercial: true,
    proprietary: false,
    integration: "UNSPECIFIED",
  },
  INTERNAL_USE: {
    distributed: false,
    networkUse: false,
    modified: false,
    commercial: false,
    proprietary: false,
    integration: "UNSPECIFIED",
  },
  RESELL: {
    distributed: true,
    networkUse: false,
    modified: false,
    commercial: true,
    proprietary: false,
    integration: "UNSPECIFIED",
  },
  WHITE_LABEL: {
    distributed: true,
    networkUse: false,
    modified: true,
    commercial: true,
    proprietary: false,
    integration: "UNSPECIFIED",
  },
  SOURCE_CODE_ACQUISITION: {
    distributed: true,
    networkUse: false,
    modified: false,
    commercial: true,
    proprietary: false,
    integration: "UNSPECIFIED",
  },
};

export const SCENARIO_LABELS: Readonly<Record<Scenario, string>> = {
  DEPENDENCY: "Use as a dependency / library",
  INCLUDE_SOURCE: "Copy source code into the project",
  MODIFY: "Modify the component",
  DISTRIBUTE_BINARY: "Distribute as binary / compiled",
  DISTRIBUTE_SOURCE: "Distribute as source code",
  COMMERCIAL_SOFTWARE: "Commercial software",
  PROPRIETARY_SOFTWARE: "Proprietary (closed-source) software",
  SAAS: "SaaS / network service (not distributed)",
  INTERNAL_USE: "Internal / private use only",
  RESELL: "Resell the software",
  WHITE_LABEL: "White-label / rebrand",
  SOURCE_CODE_ACQUISITION: "Buy or sell source code",
};

export function isScenario(value: unknown): value is Scenario {
  return typeof value === "string" && (SCENARIOS as readonly string[]).includes(value);
}

export function resolveContext(input: CompatibilityInput): RuleContext {
  if (!isScenario(input.scenario)) throw new TypeError(`Unsupported scenario: ${String(input.scenario)}`);
  const aNormalized = normalizeLicense(input.licenseA);
  const bNormalized = normalizeLicense(input.licenseB);
  const a = getLicenseById(aNormalized.id);
  const b = getLicenseById(bNormalized.id);
  const defaults = SCENARIO_DEFAULTS[input.scenario];

  return {
    scenario: input.scenario,
    a,
    b,
    aNormalized,
    bNormalized,
    distributed: input.distributed ?? defaults.distributed,
    networkUse: input.networkUse ?? defaults.networkUse,
    modified: input.modified ?? defaults.modified,
    commercial: input.commercial ?? defaults.commercial,
    finalProjectProprietary: input.finalProjectProprietary ?? (defaults.proprietary || b.category === "PROPRIETARY"),
    integration: input.integration ?? defaults.integration,
  };
}

export function runRules(ctx: RuleContext, rules: readonly Rule[] = RULES): RuleFinding[] {
  return rules.flatMap((rule) => {
    const output = rule(ctx);
    if (!output) return [];
    return Array.isArray(output) ? output : [output];
  });
}

const PERMISSION_TEXT: Record<Permission, string> = {
  PERMITTED: "permitted",
  CONDITIONAL: "permitted with restrictions",
  PROHIBITED: "not permitted",
  UNKNOWN: "unknown (depends on the actual terms)",
};

/** Fact-based summary used when no rule produced a finding for a dimension. */
function baseSummary(key: DimensionKey, a: LicenseDefinition, ctx: RuleContext): string {
  switch (key) {
    case "commercialUse":
      return `Commercial use under ${a.id}: ${PERMISSION_TEXT[a.commercialUse]}.`;
    case "modification":
      return ctx.modified
        ? `Modification under ${a.id}: ${PERMISSION_TEXT[a.modification]}.`
        : `The scenario does not include modifying the component. Modification under ${a.id}: ${PERMISSION_TEXT[a.modification]}.`;
    case "distribution":
      return ctx.distributed
        ? `Distribution under ${a.id}: ${PERMISSION_TEXT[a.distribution]}.`
        : "The scenario does not include distributing the software.";
    case "sourceDisclosure":
      return a.sourceDisclosure === "NONE"
        ? `${a.id} does not require publishing source code.`
        : `See ${a.id} source-disclosure conditions.`;
    case "attribution":
      return a.attributionRequired === false
        ? `${a.id} does not require attribution.`
        : `${a.id} attribution requirements apply on distribution.`;
    case "patents":
      return a.patentGrant === null
        ? "Patent terms are unknown."
        : a.patentGrant
          ? `${a.id} includes an express patent licence.`
          : `${a.id} has no express patent licence.`;
    case "copyleft":
      return a.copyleft === "NONE"
        ? `${a.id} has no copyleft.`
        : `${a.id} copyleft strength: ${a.copyleft.toLowerCase().replace("_", "-")}.`;
    case "networkUse":
      return ctx.networkUse
        ? `${a.id} has no network-use (SaaS) clause.`
        : `The scenario does not include offering the software over a network. ${a.networkCopyleft ? `${a.id} has a network-use clause.` : `${a.id} has no network-use clause.`}`;
    case "proprietaryUse":
      return ctx.finalProjectProprietary
        ? `No proprietary-use restriction identified for ${a.id} in this scenario.`
        : "The project is not declared proprietary.";
  }
}

function describeTarget(b: LicenseDefinition, bLabel: string): string {
  if (b.id === "Proprietary") return "a proprietary project";
  return `a project under ${bLabel}`;
}

const SUMMARY_TEMPLATES: Record<CompatibilityStatus, (subject: string) => string> = {
  GENERALLY_COMPATIBLE: (s) => `${s} is generally compatible in this scenario.`,
  COMPATIBLE_WITH_CONDITIONS: (s) => `${s} is generally possible if the listed conditions are met.`,
  POTENTIAL_CONFLICT: (s) => `${s} may conflict, depending on how the code is combined, distributed and licensed.`,
  LIKELY_INCOMPATIBLE: (s) =>
    `${s} is likely incompatible in this scenario, as the licence terms are generally understood.`,
  MANUAL_REVIEW_REQUIRED: (s) => `${s} requires review of the actual licence terms.`,
  UNKNOWN: (s) => `${s} cannot be evaluated because a licence could not be identified.`,
};

/**
 * Check whether code under `licenseA` can be used in a project under `licenseB` for the given scenario.
 * Compatibility is directional: A -> B is not the same question as B -> A.
 */
export function checkCompatibility(input: CompatibilityInput): CompatibilityResult {
  const ctx = resolveContext(input);
  const findings = runRules(ctx).sort((x, y) => SEVERITY_RANK[y.severity] - SEVERITY_RANK[x.severity]);
  const status = statusFromFindings(findings);
  const aLabel = licenseLabel(ctx.a, ctx.aNormalized);
  const bLabel = licenseLabel(ctx.b, ctx.bNormalized);
  const direction = `Using ${aLabel}-licensed code in ${describeTarget(ctx.b, bLabel)}`;

  const dimensions = Object.fromEntries(
    DIMENSION_KEYS.map((key): [DimensionKey, DimensionResult] => {
      const relevant = findings.filter((finding) => finding.dimensions.includes(key));
      const top = relevant.filter((finding) => finding.severity === relevant[0]?.severity);
      return [
        key,
        {
          status: dimensionStatus(relevant),
          summary: top.length ? unique(top.map((finding) => finding.message)).join(" ") : baseSummary(key, ctx.a, ctx),
          ruleIds: unique(relevant.map((finding) => finding.ruleId)),
        },
      ];
    }),
  ) as Record<DimensionKey, DimensionResult>;

  const explanation = unique(findings.filter((finding) => finding.severity !== "INFO").map((f) => f.message));
  const infoExplanation = unique(findings.filter((finding) => finding.severity === "INFO").map((f) => f.message));

  const recommendations = unique(findings.flatMap((finding) => finding.recommendations ?? []));
  if (
    status === "LIKELY_INCOMPATIBLE" ||
    status === "POTENTIAL_CONFLICT" ||
    status === "MANUAL_REVIEW_REQUIRED" ||
    status === "UNKNOWN"
  ) {
    recommendations.push(
      "Review the actual licence texts linked in the sources, and consider qualified legal advice for high-risk decisions.",
    );
  }

  const { a, b, aNormalized, bNormalized, ...context } = ctx;
  return {
    status,
    confidence: confidenceFromFindings(findings),
    direction,
    licenseA: a,
    licenseB: b,
    shortSummary: SUMMARY_TEMPLATES[status](direction),
    explanation: [...explanation, ...infoExplanation],
    obligations: unique(findings.flatMap((finding) => finding.obligations ?? [])),
    risks: unique(findings.flatMap((finding) => finding.risks ?? [])),
    recommendations: unique(recommendations),
    sources: uniqueSources([...findings.flatMap((finding) => finding.sources ?? []), ...a.sources, ...b.sources]),
    dimensions,
    context,
    diagnostics: {
      triggeredRules: findings.map((finding) => ({ ruleId: finding.ruleId, severity: finding.severity })),
      normalized: { a: aNormalized, b: bNormalized },
    },
    disclaimer: DISCLAIMER,
  };
}
