import type {
  CopyleftStrength,
  LicenseDefinition,
  LicenseId,
  ProjectAnalysis,
  ProjectInput,
  ProjectSections,
  ProjectWarning,
  RiskLevel,
  Scenario,
} from "../types/index.js";
import { checkCompatibility } from "../compatibility/engine.js";
import { getLicenseById, normalizeLicense } from "../licenses/index.js";
import { DISCLAIMER, hasStrongCopyleft } from "../utils/index.js";
import type { EvaluatedComponent, SectionSpec } from "./risk.js";
import { buildSection, overallFromResults, unknownSection, UNRESOLVED_RULES } from "./risk.js";

const COPYLEFT_RANK: Record<CopyleftStrength, number> = { NONE: 0, FILE_LEVEL: 1, WEAK: 2, STRONG: 3, NETWORK: 4 };

const list = (licenses: LicenseId[]) => licenses.join(", ");

const LEVEL_WORD: Record<RiskLevel, string> = {
  NONE: "No concerns identified",
  LOW: "Low",
  MEDIUM: "Medium",
  UNKNOWN: "Cannot be assessed",
  HIGH: "High",
};

const describeWith =
  (topic: string, none: string) =>
  (level: RiskLevel, licenses: LicenseId[]): string =>
    level === "NONE" ? none : `${LEVEL_WORD[level]} ${topic} risk${licenses.length ? ` (${list(licenses)})` : ""}.`;

export const PROJECT_SECTION_SPECS: Record<Exclude<keyof ProjectSections, "unknownLicenses">, SectionSpec> = {
  copyleftRisk: {
    dimension: "copyleft",
    involves: (license) => license.copyleft !== "NONE",
    describe: describeWith("copyleft", "No copyleft licences identified."),
  },
  networkCopyleft: {
    dimension: "networkUse",
    involves: (license) => license.networkCopyleft === true,
    describe: describeWith("network-use", "No network-use (SaaS) clauses identified."),
  },
  sourceDisclosure: {
    dimension: "sourceDisclosure",
    involves: (license) => license.sourceDisclosure !== "NONE" && license.sourceDisclosure !== "UNKNOWN",
    describe: describeWith("source-disclosure", "No source-disclosure obligations identified."),
  },
  patentClauses: {
    dimension: "patents",
    involves: (license) => license.patentRetaliation === true || license.id === "CC0-1.0",
    describe: (level, licenses) =>
      level === "NONE"
        ? "No patent termination or exclusion clauses identified."
        : `${LEVEL_WORD[level]} patent-clause risk. Patent clauses present in: ${list(licenses)}.`,
  },
  attributionRequirements: {
    dimension: "attribution",
    involves: (license) => license.attributionRequired === true,
    describe: (level, licenses) =>
      level === "NONE"
        ? "No attribution requirements identified."
        : `Attribution / notice requirements apply for: ${list(licenses)}.`,
  },
  proprietaryCompatibility: {
    dimension: "proprietaryUse",
    involves: () => false,
    describe: describeWith("proprietary-use", "No conflicts with proprietary use identified."),
  },
  commercialUse: {
    dimension: "commercialUse",
    involves: (license) => license.commercialUse !== "PERMITTED",
    describe: describeWith("commercial-use", "All identified licences permit commercial use."),
  },
  distributionRisk: {
    dimension: "distribution",
    involves: () => false,
    describe: describeWith("distribution", "No distribution conflicts identified."),
  },
};

interface ResolvedProject {
  target: LicenseDefinition | null;
  targetInput: string | null;
  reason: string;
  finalProjectProprietary: boolean;
}

function resolveTarget(input: ProjectInput, components: EvaluatedComponent[]): ResolvedProject {
  const context = input.context ?? {};
  if (input.projectLicense?.trim()) {
    const normalized = normalizeLicense(input.projectLicense);
    const license = getLicenseById(normalized.id);
    return {
      target: license,
      targetInput: input.projectLicense,
      reason: `Project licence given as ${input.projectLicense}.`,
      finalProjectProprietary: context.finalProjectProprietary ?? license.category === "PROPRIETARY",
    };
  }

  const proprietaryPresent = components.some((component) => component.license.category === "PROPRIETARY");
  const finalProjectProprietary = context.finalProjectProprietary ?? proprietaryPresent;
  if (finalProjectProprietary) {
    return {
      target: getLicenseById("Proprietary"),
      targetInput: "Proprietary",
      reason:
        "The project contains proprietary code or is declared proprietary, so each component is checked for use in a proprietary project.",
      finalProjectProprietary,
    };
  }

  const strongest = components
    .filter((component) => component.license.category === "OPEN_SOURCE" && hasStrongCopyleft(component.license))
    .sort((x, y) => COPYLEFT_RANK[y.license.copyleft] - COPYLEFT_RANK[x.license.copyleft])[0];
  if (strongest) {
    return {
      target: strongest.license,
      targetInput: strongest.input,
      reason: `No project licence was given. A distributed combination must satisfy its strongest copyleft licence, so components are checked against ${strongest.input}.`,
      finalProjectProprietary: false,
    };
  }

  return {
    target: null,
    targetInput: null,
    reason:
      "No project licence was given and no strong copyleft licence is present; each component is evaluated for its own obligations.",
    finalProjectProprietary: false,
  };
}

function scenarioFor(distributed: boolean, networkUse: boolean, proprietary: boolean): Scenario {
  if (proprietary && distributed) return "PROPRIETARY_SOFTWARE";
  if (networkUse && !distributed) return "SAAS";
  if (!distributed) return "INTERNAL_USE";
  return "DISTRIBUTE_BINARY";
}

/** @internal Options used by the acquisition analyzer. */
export interface AnalyzeProjectOptions {
  /** Treat a "Proprietary" entry as the project owner's own code when the project is proprietary. Default true. */
  proprietaryIsOwnCode?: boolean;
}

/**
 * Analyze a set of licences used together in one project. Each component is checked directionally
 * against the effective project licence, and results are grouped into risk sections.
 */
export function analyzeProject(input: ProjectInput, options: AnalyzeProjectOptions = {}): ProjectAnalysis {
  const proprietaryIsOwnCode = options.proprietaryIsOwnCode ?? true;
  const context = input.context ?? {};
  const seen = new Set<string>();
  const components: EvaluatedComponent[] = [];
  for (const raw of input.licenses) {
    const inputText = String(raw ?? "").trim();
    const key = inputText.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    components.push({
      input: inputText || "(empty)",
      license: getLicenseById(normalizeLicense(inputText).id),
      result: null,
    });
  }

  const target = resolveTarget(input, components);
  const distributed = context.distributed ?? true;
  const networkUse = context.networkUse ?? false;
  const scenario = scenarioFor(distributed, networkUse, target.finalProjectProprietary);

  for (const component of components) {
    const isOwnCode =
      proprietaryIsOwnCode && component.license.id === "Proprietary" && target.target?.id === "Proprietary";
    if (isOwnCode) continue;
    component.result = checkCompatibility({
      licenseA: component.input,
      licenseB: target.targetInput ?? component.input,
      scenario,
      distributed,
      networkUse,
      modified: context.modified ?? false,
      finalProjectProprietary: target.finalProjectProprietary,
      commercial: context.commercial ?? false,
      ...(context.integration ? { integration: context.integration } : {}),
    });
  }

  const sections = {
    ...Object.fromEntries(
      Object.entries(PROJECT_SECTION_SPECS).map(([key, spec]) => [key, buildSection(components, spec)]),
    ),
    unknownLicenses: unknownSection(components),
  } as ProjectSections;

  const results = components.flatMap((component) => (component.result ? [component.result] : []));
  const warnings: ProjectWarning[] = components.flatMap((component) => {
    const result = component.result;
    if (!result || result.status === "GENERALLY_COMPATIBLE") return [];
    return [
      {
        input: component.input,
        license: component.license.id,
        ruleIds: result.diagnostics.triggeredRules
          .filter((rule) => rule.severity !== "INFO")
          .map((rule) => rule.ruleId),
        message: result.shortSummary,
      },
    ];
  });

  const hasUnresolved = components.some((component) => component.license.category === "UNKNOWN");
  const overallRisk = overallFromResults(results, hasUnresolved);
  const flagged = warnings.filter((warning) => !warning.ruleIds.every((id) => UNRESOLVED_RULES.has(id)));

  return {
    overallRisk,
    summary: summarize(overallRisk, flagged, hasUnresolved),
    effectiveProjectLicense: target.target?.id ?? null,
    effectiveProjectLicenseReason: target.reason,
    sections,
    warnings,
    checks: components.flatMap((component) =>
      component.result ? [{ input: component.input, result: component.result }] : [],
    ),
    disclaimer: DISCLAIMER,
  };
}

function summarize(
  overallRisk: ProjectAnalysis["overallRisk"],
  flagged: ProjectWarning[],
  hasUnresolved: boolean,
): string {
  const names = flagged.map((warning) => warning.input).join(", ");
  switch (overallRisk) {
    case "HIGH":
      return `High risk: at least one licence is likely incompatible with the project as described (${names}).`;
    case "MANUAL_REVIEW":
      return hasUnresolved
        ? "Manual review required: some licences are unknown or custom, so the combination cannot be fully evaluated."
        : `Manual review required: some terms cannot be evaluated automatically (${names}).`;
    case "MEDIUM":
      return `Medium risk: the combination is generally possible, but conditions or potential conflicts apply (${names}).`;
    case "LOW":
      return "Low risk: no conflicts identified for the licences and context given. Notice obligations may still apply.";
  }
}
