import type {
  CompatibilityResult,
  DimensionKey,
  DimensionStatus,
  LicenseDefinition,
  LicenseId,
  OverallRisk,
  RiskLevel,
  RiskSection,
} from "../types/index.js";
import { unique } from "../utils/index.js";

export const RISK_RANK: Record<RiskLevel, number> = { NONE: 0, LOW: 1, MEDIUM: 2, UNKNOWN: 3, HIGH: 4 };

export const maxRisk = (...levels: RiskLevel[]): RiskLevel =>
  levels.reduce<RiskLevel>((max, level) => (RISK_RANK[level] > RISK_RANK[max] ? level : max), "NONE");

export const DIMENSION_RISK: Record<DimensionStatus, RiskLevel> = {
  OK: "NONE",
  OBLIGATIONS: "LOW",
  CONDITIONS: "MEDIUM",
  WARNING: "MEDIUM",
  REVIEW: "UNKNOWN",
  CONFLICT: "HIGH",
  UNKNOWN: "UNKNOWN",
};

/** Rule ids that describe an unidentified licence; reported only in the unknown-licences section. */
export const UNRESOLVED_RULES = new Set(["UNKNOWN_LICENSE", "CUSTOM_LICENSE_REVIEW"]);

export interface EvaluatedComponent {
  input: string;
  license: LicenseDefinition;
  result: CompatibilityResult | null;
}

export interface SectionSpec {
  dimension: DimensionKey;
  /** Licences that inherently carry this concern (sets a LOW baseline). */
  involves: (license: LicenseDefinition) => boolean;
  describe: (level: RiskLevel, licenses: LicenseId[]) => string;
}

export function buildSection(components: readonly EvaluatedComponent[], spec: SectionSpec): RiskSection {
  let level: RiskLevel = "NONE";
  const licenses: LicenseId[] = [];
  const inputs: string[] = [];
  const ruleIds: string[] = [];
  const details: string[] = [];

  for (const component of components) {
    if (component.license.category === "UNKNOWN") continue;
    const dimension = component.result?.dimensions[spec.dimension];
    const relevantRules = (dimension?.ruleIds ?? []).filter((id) => !UNRESOLVED_RULES.has(id));
    const fromDimension = dimension && relevantRules.length ? DIMENSION_RISK[dimension.status] : "NONE";
    const baseline: RiskLevel = spec.involves(component.license) ? "LOW" : "NONE";
    const componentLevel = maxRisk(baseline, fromDimension);
    if (componentLevel === "NONE") continue;

    level = maxRisk(level, componentLevel);
    licenses.push(component.license.id);
    inputs.push(component.input);
    ruleIds.push(...relevantRules);
    if (dimension && RISK_RANK[fromDimension] >= RISK_RANK.MEDIUM) {
      details.push(`${component.input}: ${dimension.summary}`);
    }
  }

  const uniqueLicenses = unique(licenses);
  return {
    level,
    summary: spec.describe(level, uniqueLicenses),
    details: unique(details),
    licenses: uniqueLicenses,
    inputs: unique(inputs),
    ruleIds: unique(ruleIds),
  };
}

export function unknownSection(components: readonly EvaluatedComponent[]): RiskSection {
  const unresolved = components.filter((component) => component.license.category === "UNKNOWN");
  return {
    level: unresolved.length ? "UNKNOWN" : "NONE",
    summary: unresolved.length
      ? `${unresolved.length} licence${unresolved.length === 1 ? "" : "s"} could not be identified or ${unresolved.length === 1 ? "is" : "are"} custom. No permissions can be assumed until the actual terms are reviewed.`
      : "All listed licences were identified.",
    details: unresolved.map((component) =>
      component.license.id === "Custom"
        ? `${component.input}: custom licence, terms must be reviewed.`
        : `${component.input}: licence not recognized.`,
    ),
    licenses: unique(unresolved.map((component) => component.license.id)),
    inputs: unique(unresolved.map((component) => component.input)),
    ruleIds: unique(
      unresolved.flatMap((component) =>
        (component.result?.diagnostics.triggeredRules ?? [])
          .map((rule) => rule.ruleId)
          .filter((id) => UNRESOLVED_RULES.has(id)),
      ),
    ),
  };
}

export function overallFromResults(results: readonly CompatibilityResult[], hasUnresolved: boolean): OverallRisk {
  const statuses = new Set(results.map((result) => result.status));
  if (statuses.has("LIKELY_INCOMPATIBLE")) return "HIGH";
  if (hasUnresolved || statuses.has("UNKNOWN") || statuses.has("MANUAL_REVIEW_REQUIRED")) return "MANUAL_REVIEW";
  if (statuses.has("POTENTIAL_CONFLICT") || statuses.has("COMPATIBLE_WITH_CONDITIONS")) return "MEDIUM";
  return "LOW";
}

export function overallFromSections(sections: readonly RiskSection[]): OverallRisk {
  const levels = sections.map((section) => section.level);
  if (levels.includes("HIGH")) return "HIGH";
  if (levels.includes("UNKNOWN")) return "MANUAL_REVIEW";
  if (levels.includes("MEDIUM")) return "MEDIUM";
  return "LOW";
}
