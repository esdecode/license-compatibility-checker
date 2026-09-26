import type { Rule } from "../../types/index.js";
import { attributionRule } from "./attribution.js";
import { commercialUseRule } from "./commercial-use.js";
import { copyleftRule } from "./copyleft.js";
import { distributionRule } from "./distribution.js";
import { modificationRule } from "./modification.js";
import { networkUseRule } from "./network-use.js";
import { patentsRule } from "./patents.js";
import { proprietaryRule } from "./proprietary.js";
import { sourceDisclosureRule } from "./source-disclosure.js";
import { unknownLicenseRule } from "./unknown.js";

export {
  attributionRule,
  commercialUseRule,
  copyleftRule,
  distributionRule,
  modificationRule,
  networkUseRule,
  patentsRule,
  proprietaryRule,
  sourceDisclosureRule,
  unknownLicenseRule,
};

/** Evaluation order. Every rule is independent; order only affects explanation ordering within a severity. */
export const RULES: readonly Rule[] = [
  unknownLicenseRule,
  copyleftRule,
  networkUseRule,
  proprietaryRule,
  commercialUseRule,
  sourceDisclosureRule,
  attributionRule,
  modificationRule,
  distributionRule,
  patentsRule,
];
