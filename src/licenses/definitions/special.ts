import type { LicenseDefinition } from "../../types/index.js";
import { SOURCES } from "../sources/index.js";

/** Everything is unknown until the actual agreement is read. */
const unknownTerms = {
  osiApproved: false,
  fsfGplCompatible: null,
  commercialUse: "UNKNOWN",
  privateUse: "UNKNOWN",
  modification: "UNKNOWN",
  distribution: "UNKNOWN",
  sublicensing: "UNKNOWN",
  patentGrant: null,
  patentRetaliation: null,
  trademarkUse: "UNKNOWN",
  attributionRequired: null,
  licenseNoticeRequired: null,
  copyrightNoticeRequired: null,
  sourceDisclosure: "UNKNOWN",
  copyleft: "NONE",
  networkCopyleft: null,
  sameLicenseRequired: null,
  stateChangesRequired: null,
  permissions: [],
  conditions: [],
  limitations: [],
} as const;

export const PROPRIETARY: LicenseDefinition = {
  ...unknownTerms,
  id: "Proprietary",
  name: "Proprietary / commercial licence",
  spdxId: null,
  category: "PROPRIETARY",
  family: "PROPRIETARY",
  description:
    "Closed-source or commercial terms defined by a specific agreement (EULA, commercial licence, marketplace licence). Rights depend entirely on that agreement.",
  restrictions: ["Rights are defined by the specific agreement and cannot be assumed"],
  sources: [SOURCES.spdxLicenseList],
};

export const CUSTOM: LicenseDefinition = {
  ...unknownTerms,
  id: "Custom",
  name: "Custom licence",
  spdxId: null,
  category: "UNKNOWN",
  family: "UNKNOWN",
  description:
    "A licence text that is not a recognised standard licence. Its terms must be read and evaluated individually.",
  restrictions: ["Terms not machine-evaluable"],
  sources: [SOURCES.spdxLicenseList],
};

export const UNKNOWN: LicenseDefinition = {
  ...unknownTerms,
  id: "Unknown",
  name: "Unknown licence",
  spdxId: null,
  category: "UNKNOWN",
  family: "UNKNOWN",
  description:
    "No licence could be identified. Without a licence, default copyright rules generally apply and no permission to use, modify or distribute should be assumed.",
  restrictions: ["No permissions can be assumed"],
  sources: [SOURCES.spdxLicenseList],
};
