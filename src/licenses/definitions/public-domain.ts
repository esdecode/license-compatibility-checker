import type { LicenseDefinition } from "../../types/index.js";
import { official, osi, spdx } from "../sources/index.js";

const publicDomainBase = {
  category: "PUBLIC_DOMAIN_EQUIVALENT",
  family: "PUBLIC_DOMAIN",
  fsfGplCompatible: true,
  commercialUse: "PERMITTED",
  privateUse: "PERMITTED",
  modification: "PERMITTED",
  distribution: "PERMITTED",
  sublicensing: "PERMITTED",
  patentGrant: false,
  patentRetaliation: false,
  attributionRequired: false,
  licenseNoticeRequired: false,
  copyrightNoticeRequired: false,
  sourceDisclosure: "NONE",
  copyleft: "NONE",
  networkCopyleft: false,
  sameLicenseRequired: false,
  stateChangesRequired: false,
  restrictions: [],
} as const;

export const UNLICENSE: LicenseDefinition = {
  ...publicDomainBase,
  id: "Unlicense",
  name: "The Unlicense",
  spdxId: "Unlicense",
  osiApproved: true,
  trademarkUse: "UNKNOWN",
  description:
    "A public domain dedication with a permissive fallback grant for jurisdictions where dedication is not effective. No attribution is required.",
  permissions: ["Commercial use", "Modification", "Distribution", "Private use"],
  conditions: [],
  limitations: ["No warranty", "No liability", "No express patent licence"],
  sources: [
    spdx("Unlicense"),
    osi("unlicense", "The Unlicense"),
    official("The Unlicense (official text)", "https://unlicense.org/"),
  ],
};

export const CC0_1_0: LicenseDefinition = {
  ...publicDomainBase,
  id: "CC0-1.0",
  name: "Creative Commons Zero v1.0 Universal",
  spdxId: "CC0-1.0",
  osiApproved: false,
  trademarkUse: "PROHIBITED",
  description:
    "A public domain waiver with a fallback licence. Section 4(a) states that no trademark or patent rights held by the affirmer are waived, abandoned, surrendered or licensed.",
  permissions: ["Commercial use", "Modification", "Distribution", "Private use"],
  conditions: [],
  limitations: ["No warranty", "No liability", "Patent and trademark rights expressly not licensed (section 4(a))"],
  sources: [
    spdx("CC0-1.0"),
    official("CC0 1.0 Universal legal code", "https://creativecommons.org/publicdomain/zero/1.0/legalcode"),
  ],
};
