import type {
  AcquisitionInput,
  AcquisitionReport,
  AcquisitionSections,
  CompatibilityResult,
  DimensionKey,
  LicenseDefinition,
  RiskLevel,
  RiskSection,
  Scenario,
} from "../types/index.js";
import { checkCompatibility } from "../compatibility/engine.js";
import { getLicense } from "../licenses/index.js";
import { analyzeProject } from "../project/analyzer.js";
import { DIMENSION_RISK, maxRisk, overallFromSections } from "../project/risk.js";
import { DISCLAIMER, hasStrongCopyleft, unique } from "../utils/index.js";
import { buildSellerQuestions } from "./questions.js";

const SCOPE_NOTE =
  "This report identifies licensing risks and questions based on the licences you entered. It does not verify who owns the copyright, whether the listed licences are complete or accurate, or whether the seller has the right to sell the code.";

function section(level: RiskLevel, summary: string, extra: Partial<RiskSection> = {}): RiskSection {
  return { level, summary, details: [], licenses: [], inputs: [], ruleIds: [], ...extra };
}

function fromMainDimension(
  main: CompatibilityResult,
  key: DimensionKey,
  input: string,
): Partial<RiskSection> & { level: RiskLevel } {
  const dimension = main.dimensions[key];
  const level = dimension.ruleIds.length ? DIMENSION_RISK[dimension.status] : "NONE";
  return {
    level,
    details: level === "NONE" ? [] : [`${input} (main project): ${dimension.summary}`],
    licenses: level === "NONE" ? [] : [main.licenseA.id],
    inputs: level === "NONE" ? [] : [input],
    ruleIds: dimension.ruleIds,
  };
}

function combine(
  summary: (level: RiskLevel) => string,
  ...parts: (Partial<RiskSection> & { level: RiskLevel })[]
): RiskSection {
  const level = maxRisk(...parts.map((part) => part.level));
  return {
    level,
    summary: summary(level),
    details: unique(parts.flatMap((part) => part.details ?? [])),
    licenses: unique(parts.flatMap((part) => part.licenses ?? [])),
    inputs: unique(parts.flatMap((part) => part.inputs ?? [])),
    ruleIds: unique(parts.flatMap((part) => part.ruleIds ?? [])),
  };
}

function scenarioFor(input: AcquisitionInput): Scenario {
  if (input.whiteLabel) return "WHITE_LABEL";
  if (input.resale) return "RESELL";
  return "SOURCE_CODE_ACQUISITION";
}

function ownershipSection(main: LicenseDefinition, mainInput: string): RiskSection {
  if (main.id === "Unknown") {
    return section(
      "HIGH",
      "No licence could be identified for the main project. Without a licence, buying the code does not by itself grant rights to use, modify or distribute it.",
      {
        licenses: [main.id],
        inputs: [mainInput],
      },
    );
  }
  if (main.category === "OPEN_SOURCE" || main.category === "PUBLIC_DOMAIN_EQUIVALENT") {
    return section(
      "MEDIUM",
      `The main project is under ${main.id}, which anyone who receives the code can use under the same terms. Buying it does not give exclusive rights unless the copyright holder transfers or licenses them separately. Ownership itself cannot be verified here.`,
      { licenses: [main.id], inputs: [mainInput] },
    );
  }
  return section(
    "MEDIUM",
    "Ownership cannot be verified from licence data. Confirm that the seller wrote the code or holds the rights, and what exactly is transferred: a licence to use it, or the copyright itself.",
    { licenses: [main.id], inputs: [mainInput] },
  );
}

/**
 * Evaluate licensing risk when buying (or selling) source code for a given intended use.
 * It identifies risks and questions; it does not verify copyright ownership.
 */
export function analyzeSourceCodeAcquisition(input: AcquisitionInput): AcquisitionReport {
  const finalProjectProprietary = input.finalProjectProprietary ?? true;
  const distributed = input.redistribution || input.resale || input.whiteLabel;
  const modified = input.modification || input.whiteLabel;
  const commercial = input.commercialUse || input.resale || input.whiteLabel;
  const mainInput = input.mainProjectLicense?.trim() || "Unknown";
  const main = getLicense(mainInput);
  const thirdParty = input.thirdPartyLicenses.map((license) => String(license ?? "").trim()).filter(Boolean);

  const context = { distributed, networkUse: input.saas, modified, commercial, finalProjectProprietary };
  const mainCheck = checkCompatibility({
    licenseA: mainInput,
    licenseB: finalProjectProprietary ? "Proprietary" : mainInput,
    scenario: scenarioFor(input),
    ...context,
  });

  const project = analyzeProject(
    {
      licenses: [mainInput, ...thirdParty],
      projectLicense: finalProjectProprietary ? "Proprietary" : mainInput,
      context,
    },
    { proprietaryIsOwnCode: false },
  );
  const thirdPartyProject = thirdParty.length
    ? analyzeProject(
        { licenses: thirdParty, projectLicense: finalProjectProprietary ? "Proprietary" : mainInput, context },
        { proprietaryIsOwnCode: false },
      )
    : null;
  const s = project.sections;

  const thirdPartyComponents: RiskSection = thirdPartyProject
    ? section(
        thirdPartyProject.overallRisk === "HIGH"
          ? "HIGH"
          : thirdPartyProject.overallRisk === "MANUAL_REVIEW"
            ? "UNKNOWN"
            : thirdPartyProject.overallRisk,
        `${thirdParty.length} third-party licence${thirdParty.length === 1 ? "" : "s"} listed. ${thirdPartyProject.summary}`,
        {
          details: thirdPartyProject.warnings.map((warning) => `${warning.input}: ${warning.message}`),
          licenses: unique(thirdPartyProject.warnings.map((warning) => warning.license)),
          inputs: unique(thirdPartyProject.warnings.map((warning) => warning.input)),
          ruleIds: unique(thirdPartyProject.warnings.flatMap((warning) => warning.ruleIds)),
        },
      )
    : section(
        "UNKNOWN",
        "No third-party licences were listed. Almost every project has dependencies; ask the seller for a complete list before relying on this report.",
      );

  const licenses = [main, ...thirdParty.map((license) => getLicense(license))];
  const copyleftPresent = licenses.some((license) => hasStrongCopyleft(license));

  const sections: AcquisitionSections = {
    commercialUse: combine(
      (level) =>
        level === "NONE" || level === "LOW"
          ? "The identified licences permit commercial use."
          : "Commercial use is restricted or depends on terms that must be reviewed.",
      fromMainDimension(mainCheck, "commercialUse", mainInput),
      s.commercialUse,
    ),
    ownershipRisk: ownershipSection(main, mainInput),
    copyleftRisk: combine(
      (level) =>
        level === "NONE"
          ? "No copyleft licences identified."
          : level === "HIGH"
            ? "Copyleft terms likely conflict with the intended proprietary use or distribution."
            : "Copyleft terms apply; review how the components are combined and distributed.",
      fromMainDimension(mainCheck, "copyleft", mainInput),
      s.copyleftRisk,
    ),
    thirdPartyComponents,
    redistribution: distributed
      ? combine(
          (level) =>
            level === "HIGH"
              ? "Redistribution as planned likely conflicts with at least one licence."
              : level === "UNKNOWN"
                ? "Redistribution rights depend on terms that must be confirmed (proprietary, custom or unknown licences)."
                : "Redistribution is planned; notice and licence obligations travel with the code.",
          fromMainDimension(mainCheck, "distribution", mainInput),
          s.distributionRisk,
          s.attributionRequirements,
        )
      : section(
          "NONE",
          "No redistribution, resale or white-labelling is planned. Distribution obligations are not triggered by that use.",
        ),
    saasNetworkUse: input.saas
      ? combine(
          (level) =>
            level === "NONE" || level === "LOW"
              ? "No network-use clauses conflict with SaaS use for the identified licences."
              : "Network-use or hosted-service restrictions apply.",
          fromMainDimension(mainCheck, "networkUse", mainInput),
          s.networkCopyleft,
        )
      : section("NONE", "SaaS / network use is not planned."),
    whiteLabelResale:
      input.whiteLabel || input.resale
        ? combine(
            (level) =>
              level === "UNKNOWN"
                ? "White-label or resale rights depend on terms that must be confirmed with the seller."
                : level === "HIGH"
                  ? "White-labelling or resale as planned likely conflicts with at least one licence."
                  : "Third-party notices must be kept when rebranding or reselling; copyleft code stays under its licence for your customers.",
            fromMainDimension(mainCheck, "proprietaryUse", mainInput),
            main.category === "PROPRIETARY" || main.category === "UNKNOWN"
              ? {
                  level: "UNKNOWN",
                  details: ["White-label and resale rights must be granted explicitly by the seller's licence."],
                  inputs: [mainInput],
                  licenses: [main.id],
                }
              : { level: copyleftPresent ? "MEDIUM" : "LOW" },
            {
              level: s.attributionRequirements.level === "NONE" ? "NONE" : "LOW",
              licenses: s.attributionRequirements.licenses,
              inputs: s.attributionRequirements.inputs,
            },
          )
        : section("NONE", "No white-labelling or resale is planned."),
    unknownComponents: s.unknownLicenses,
  };

  const overallRisk = overallFromSections(Object.values(sections));
  return {
    overallRisk,
    summary: summarize(overallRisk, mainInput),
    sections,
    sellerQuestions: buildSellerQuestions(input, licenses, main),
    project,
    scopeNote: SCOPE_NOTE,
    disclaimer: DISCLAIMER,
  };
}

function summarize(risk: AcquisitionReport["overallRisk"], mainInput: string): string {
  switch (risk) {
    case "HIGH":
      return `High licensing risk for the intended use of ${mainInput} code. Resolve the flagged conflicts before buying or shipping.`;
    case "MANUAL_REVIEW":
      return "Manual review required: some licence terms are proprietary, custom, unknown or not listed. Ask the seller the questions below.";
    case "MEDIUM":
      return "Medium licensing risk: the intended use looks possible, subject to the conditions listed. Ask the seller the questions below.";
    case "LOW":
      return "Low licensing risk based on the licences entered. Ownership and completeness of the licence list still need to be confirmed with the seller.";
  }
}
