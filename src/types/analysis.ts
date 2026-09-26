import type { CompatibilityResult, IntegrationMode } from "./compatibility.js";
import type { LicenseId } from "./license.js";

export type RiskLevel = "NONE" | "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";

export type OverallRisk = "LOW" | "MEDIUM" | "HIGH" | "MANUAL_REVIEW";

export interface RiskSection {
  level: RiskLevel;
  summary: string;
  details: string[];
  /** Licences (as normalized ids) responsible for the level. */
  licenses: LicenseId[];
  /** Original input strings responsible for the level (useful for unrecognized licences). */
  inputs: string[];
  ruleIds: string[];
}

export interface ProjectContext {
  distributed?: boolean;
  networkUse?: boolean;
  modified?: boolean;
  finalProjectProprietary?: boolean;
  commercial?: boolean;
  integration?: IntegrationMode;
}

export interface ProjectInput {
  /** Licences of the components in the project. "Proprietary" marks proprietary code. */
  licenses: string[];
  /** Licence the combined project is offered under. Optional. */
  projectLicense?: string;
  context?: ProjectContext;
}

export interface ProjectSections {
  copyleftRisk: RiskSection;
  networkCopyleft: RiskSection;
  sourceDisclosure: RiskSection;
  patentClauses: RiskSection;
  attributionRequirements: RiskSection;
  proprietaryCompatibility: RiskSection;
  commercialUse: RiskSection;
  distributionRisk: RiskSection;
  unknownLicenses: RiskSection;
}

export interface ProjectWarning {
  input: string;
  license: LicenseId;
  ruleIds: string[];
  message: string;
}

export interface ProjectAnalysis {
  overallRisk: OverallRisk;
  summary: string;
  /** Licence every component was checked against; null when none could be determined. */
  effectiveProjectLicense: LicenseId | null;
  effectiveProjectLicenseReason: string;
  sections: ProjectSections;
  warnings: ProjectWarning[];
  checks: { input: string; result: CompatibilityResult }[];
  disclaimer: string;
}

export interface AcquisitionInput {
  mainProjectLicense: string;
  thirdPartyLicenses: string[];
  commercialUse: boolean;
  saas: boolean;
  redistribution: boolean;
  modification: boolean;
  whiteLabel: boolean;
  resale: boolean;
  /** Buyer intends to ship the result under closed terms. Defaults to true. */
  finalProjectProprietary?: boolean;
}

export type SellerQuestionTopic =
  | "COPYRIGHT_OWNERSHIP"
  | "COPIED_THIRD_PARTY_CODE"
  | "UNDOCUMENTED_DEPENDENCIES"
  | "COPYLEFT_COMPONENTS"
  | "COMMERCIAL_PLUGINS"
  | "LICENSE_TRANSFERABILITY"
  | "IMAGES"
  | "FONTS"
  | "ICONS"
  | "DATASETS"
  | "API_INTEGRATIONS"
  | "SOURCE_AVAILABLE_COMPONENTS"
  | "REDISTRIBUTION_RIGHTS"
  | "WHITE_LABEL_RIGHTS"
  | "UNKNOWN_COMPONENTS"
  | "MAIN_LICENSE_TERMS";

export interface SellerQuestion {
  id: string;
  topic: SellerQuestionTopic;
  question: string;
  reason: string;
}

export interface AcquisitionSections {
  commercialUse: RiskSection;
  ownershipRisk: RiskSection;
  copyleftRisk: RiskSection;
  thirdPartyComponents: RiskSection;
  redistribution: RiskSection;
  saasNetworkUse: RiskSection;
  whiteLabelResale: RiskSection;
  unknownComponents: RiskSection;
}

export interface AcquisitionReport {
  overallRisk: OverallRisk;
  summary: string;
  sections: AcquisitionSections;
  sellerQuestions: SellerQuestion[];
  project: ProjectAnalysis;
  /** This report identifies licensing questions; it does not verify copyright ownership. */
  scopeNote: string;
  disclaimer: string;
}
