import type { LicenseDefinition, LicenseSource, NormalizedLicense } from "./license.js";

export const SCENARIOS = [
  "DEPENDENCY",
  "INCLUDE_SOURCE",
  "MODIFY",
  "DISTRIBUTE_BINARY",
  "DISTRIBUTE_SOURCE",
  "COMMERCIAL_SOFTWARE",
  "PROPRIETARY_SOFTWARE",
  "SAAS",
  "INTERNAL_USE",
  "RESELL",
  "WHITE_LABEL",
  "SOURCE_CODE_ACQUISITION",
] as const;

export type Scenario = (typeof SCENARIOS)[number];

/** How the component (licence A) is combined with the project (licence B). */
export type IntegrationMode = "DYNAMIC_LINK" | "STATIC_LINK" | "SOURCE_INCLUSION" | "SEPARATE_PROGRAM" | "UNSPECIFIED";

export const COMPATIBILITY_STATUSES = [
  "GENERALLY_COMPATIBLE",
  "COMPATIBLE_WITH_CONDITIONS",
  "POTENTIAL_CONFLICT",
  "LIKELY_INCOMPATIBLE",
  "MANUAL_REVIEW_REQUIRED",
  "UNKNOWN",
] as const;

export type CompatibilityStatus = (typeof COMPATIBILITY_STATUSES)[number];

export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export const DIMENSION_KEYS = [
  "commercialUse",
  "modification",
  "distribution",
  "sourceDisclosure",
  "attribution",
  "patents",
  "copyleft",
  "networkUse",
  "proprietaryUse",
] as const;

export type DimensionKey = (typeof DIMENSION_KEYS)[number];

export type DimensionStatus = "OK" | "OBLIGATIONS" | "CONDITIONS" | "WARNING" | "CONFLICT" | "REVIEW" | "UNKNOWN";

export interface DimensionResult {
  status: DimensionStatus;
  summary: string;
  ruleIds: string[];
}

/**
 * INFO: context only, no effect on status (may still carry obligations such as attribution).
 * CONDITION: permitted when structural conditions are met (source disclosure, relinking, relicensing).
 * WARNING: a conflict is plausible depending on facts the engine cannot see.
 * REVIEW: the terms are not machine-evaluable; the actual text must be read.
 * CONFLICT: the licence terms, as generally understood, do not permit the combination.
 * UNKNOWN: a licence could not be identified.
 */
export type Severity = "INFO" | "CONDITION" | "WARNING" | "REVIEW" | "CONFLICT" | "UNKNOWN";

export interface RuleFinding {
  ruleId: string;
  severity: Severity;
  dimensions: DimensionKey[];
  message: string;
  obligations?: string[];
  risks?: string[];
  recommendations?: string[];
  sources?: LicenseSource[];
  /** Lowers overall confidence when the finding depends on facts that are commonly disputed. */
  confidence?: Confidence;
}

export interface CompatibilityInput {
  /** Licence of the component being used (inbound). */
  licenseA: string;
  /** Licence of the project the component is used in (outbound). Use "Proprietary" for closed source. */
  licenseB: string;
  scenario: Scenario;
  distributed?: boolean;
  networkUse?: boolean;
  modified?: boolean;
  /** The final project is offered under proprietary / closed terms. */
  finalProjectProprietary?: boolean;
  commercial?: boolean;
  integration?: IntegrationMode;
}

/** Fully resolved evaluation context handed to every rule. */
export interface RuleContext {
  scenario: Scenario;
  a: LicenseDefinition;
  b: LicenseDefinition;
  aNormalized: NormalizedLicense;
  bNormalized: NormalizedLicense;
  distributed: boolean;
  networkUse: boolean;
  modified: boolean;
  finalProjectProprietary: boolean;
  commercial: boolean;
  integration: IntegrationMode;
}

export type Rule = (ctx: RuleContext) => RuleFinding | RuleFinding[] | null;

export interface CompatibilityResult {
  status: CompatibilityStatus;
  confidence: Confidence;
  /** Plain statement of the direction evaluated, e.g. "Using MIT-licensed code in a GPL-3.0 project". */
  direction: string;
  licenseA: LicenseDefinition;
  licenseB: LicenseDefinition;
  shortSummary: string;
  explanation: string[];
  obligations: string[];
  risks: string[];
  recommendations: string[];
  sources: LicenseSource[];
  dimensions: Record<DimensionKey, DimensionResult>;
  context: Omit<RuleContext, "a" | "b" | "aNormalized" | "bNormalized">;
  diagnostics: {
    triggeredRules: { ruleId: string; severity: Severity }[];
    normalized: { a: NormalizedLicense; b: NormalizedLicense };
  };
  disclaimer: string;
}
