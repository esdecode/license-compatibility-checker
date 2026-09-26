import type { AcquisitionInput, LicenseDefinition, SellerQuestion } from "../types/index.js";
import { hasStrongCopyleft } from "../utils/index.js";

const BASE_QUESTIONS: readonly SellerQuestion[] = [
  {
    id: "ownership",
    topic: "COPYRIGHT_OWNERSHIP",
    question:
      "Did you write all of the code yourself, or do you otherwise hold the rights to license it (including code written by employees, contractors or co-founders)?",
    reason: "A seller can only grant rights they hold. This analyzer cannot verify ownership.",
  },
  {
    id: "copied-code",
    topic: "COPIED_THIRD_PARTY_CODE",
    question:
      "Does the project contain code copied from tutorials, Stack Overflow, GitHub, other products or AI tools? If so, from where and under which licences?",
    reason: "Copied snippets carry their original licence, which is often undocumented.",
  },
  {
    id: "dependencies",
    topic: "UNDOCUMENTED_DEPENDENCIES",
    question:
      "Can you provide a complete list of dependencies (package manifests and lock files) and any vendored libraries with their licences?",
    reason: "Undocumented dependencies are the most common source of licence surprises.",
  },
  {
    id: "commercial-plugins",
    topic: "COMMERCIAL_PLUGINS",
    question:
      "Does the project include paid plugins, themes, templates or libraries (e.g. premium UI kits, WordPress plugins, grid or chart components)?",
    reason: "Commercial components are usually licensed per buyer or per project and often cannot be passed on.",
  },
  {
    id: "transferability",
    topic: "LICENSE_TRANSFERABILITY",
    question:
      "Are all commercial licences used in the project transferable to the buyer, or will the buyer need to purchase their own?",
    reason: "Many commercial licences are non-transferable.",
  },
  {
    id: "images",
    topic: "IMAGES",
    question:
      "Where do the images, illustrations and screenshots come from, and under what licence may they be used and redistributed?",
    reason: "Stock and AI-generated images carry their own terms, separate from the code.",
  },
  {
    id: "fonts",
    topic: "FONTS",
    question: "Which fonts are bundled or embedded, and do their licences allow redistribution and web embedding?",
    reason: "Desktop font licences often do not permit web embedding or redistribution.",
  },
  {
    id: "icons",
    topic: "ICONS",
    question: "Which icon sets are used, and do their licences require attribution or a paid plan?",
    reason: "Several popular icon sets require attribution or a paid licence.",
  },
  {
    id: "datasets",
    topic: "DATASETS",
    question:
      "Does the project ship datasets, seed data, AI models or content scraped from third parties? Under what terms?",
    reason: "Data and models are frequently licensed for non-commercial use only.",
  },
  {
    id: "apis",
    topic: "API_INTEGRATIONS",
    question:
      "Which third-party APIs and services does the project depend on, and do their terms allow the buyer's intended use?",
    reason: "API terms of service can restrict commercial use, resale or white-labelling.",
  },
];

export function buildSellerQuestions(
  input: AcquisitionInput,
  licenses: readonly LicenseDefinition[],
  main: LicenseDefinition,
): SellerQuestion[] {
  const questions: SellerQuestion[] = [...BASE_QUESTIONS];

  if (main.category === "PROPRIETARY" || main.category === "UNKNOWN") {
    questions.unshift({
      id: "main-license-terms",
      topic: "MAIN_LICENSE_TERMS",
      question:
        "Can you provide the full licence agreement for the project, including what the buyer may use, modify, redistribute, resell and sublicense?",
      reason: "For proprietary, custom or unidentified terms, the actual agreement defines the buyer's rights.",
    });
  }

  const copyleft = licenses.filter(
    (license) => hasStrongCopyleft(license) || license.copyleft === "WEAK" || license.copyleft === "FILE_LEVEL",
  );
  if (copyleft.length) {
    questions.push({
      id: "copyleft-components",
      topic: "COPYLEFT_COMPONENTS",
      question: `How are the copyleft components (${[...new Set(copyleft.map((license) => license.id))].join(", ")}) integrated: modified, linked or copied into the project's own code?`,
      reason: "Copyleft obligations depend on how components are combined and distributed.",
    });
  } else {
    questions.push({
      id: "gpl-agpl",
      topic: "COPYLEFT_COMPONENTS",
      question: "Does the project contain any GPL or AGPL code, including in build tools, plugins or copied snippets?",
      reason: "GPL/AGPL code can prevent proprietary distribution or closed SaaS use.",
    });
  }

  const sourceAvailable = licenses.filter((license) => license.category === "SOURCE_AVAILABLE");
  questions.push({
    id: "source-available",
    topic: "SOURCE_AVAILABLE_COMPONENTS",
    question: sourceAvailable.length
      ? `How is ${[...new Set(sourceAvailable.map((license) => license.id))].join(", ")} used, and does the buyer's intended use stay within its restrictions?`
      : "Does the project depend on source-available software (e.g. BUSL, SSPL, Elastic License) whose terms restrict production or hosted use?",
    reason: "Source-available licences restrict uses that open-source licences allow.",
  });

  if (licenses.some((license) => license.category === "UNKNOWN")) {
    questions.push({
      id: "unknown-components",
      topic: "UNKNOWN_COMPONENTS",
      question:
        "Which licences apply to the components whose licence is unknown or custom? Please provide the licence texts.",
      reason: "No rights can be assumed for components without an identified licence.",
    });
  }

  if (input.redistribution || input.resale) {
    questions.push({
      id: "redistribution",
      topic: "REDISTRIBUTION_RIGHTS",
      question:
        "Does the licence you grant allow the buyer to redistribute or resell the software, in source or binary form, to their own customers?",
      reason: "Many marketplace licences allow use in end products but prohibit redistributing the source itself.",
    });
  }

  if (input.whiteLabel || input.resale) {
    questions.push({
      id: "white-label",
      topic: "WHITE_LABEL_RIGHTS",
      question:
        "May the buyer rebrand (white-label) the product, remove your branding, and sell it under their own name?",
      reason:
        "White-label and resale rights must be granted explicitly; third-party notices usually still have to be kept.",
    });
  }

  return questions;
}
