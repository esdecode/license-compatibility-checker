import type { LicenseDefinition } from "../../types/index.js";
import { official, osi, spdx } from "../sources/index.js";

const permissiveBase = {
  category: "OPEN_SOURCE",
  family: "PERMISSIVE",
  osiApproved: true,
  fsfGplCompatible: true,
  commercialUse: "PERMITTED",
  privateUse: "PERMITTED",
  modification: "PERMITTED",
  distribution: "PERMITTED",
  sublicensing: "PERMITTED",
  attributionRequired: true,
  licenseNoticeRequired: true,
  copyrightNoticeRequired: true,
  sourceDisclosure: "NONE",
  copyleft: "NONE",
  networkCopyleft: false,
  sameLicenseRequired: false,
  restrictions: [],
} as const;

export const MIT: LicenseDefinition = {
  ...permissiveBase,
  id: "MIT",
  name: "MIT License",
  spdxId: "MIT",
  patentGrant: false,
  patentRetaliation: false,
  trademarkUse: "UNKNOWN",
  stateChangesRequired: false,
  description:
    "A short permissive licence. The copyright notice and permission notice must be included in all copies or substantial portions of the software.",
  permissions: ["Commercial use", "Modification", "Distribution", "Sublicensing", "Private use"],
  conditions: ["Include the copyright notice and permission notice in all copies or substantial portions"],
  limitations: ["No warranty", "No liability", "No express patent licence"],
  sources: [spdx("MIT"), osi("mit", "The MIT License")],
};

export const ISC: LicenseDefinition = {
  ...permissiveBase,
  id: "ISC",
  name: "ISC License",
  spdxId: "ISC",
  patentGrant: false,
  patentRetaliation: false,
  trademarkUse: "UNKNOWN",
  stateChangesRequired: false,
  description:
    "A permissive licence functionally similar to MIT. The copyright notice and permission notice must appear in all copies.",
  permissions: ["Commercial use", "Modification", "Distribution", "Private use"],
  conditions: ["Include the copyright notice and permission notice in all copies"],
  limitations: ["No warranty", "No liability", "No express patent licence"],
  sources: [spdx("ISC"), osi("isc-license-txt", "ISC License")],
};

export const BSD_2_CLAUSE: LicenseDefinition = {
  ...permissiveBase,
  id: "BSD-2-Clause",
  name: 'BSD 2-Clause "Simplified" License',
  spdxId: "BSD-2-Clause",
  patentGrant: false,
  patentRetaliation: false,
  trademarkUse: "UNKNOWN",
  stateChangesRequired: false,
  description:
    "A permissive licence. Source redistributions must retain the notice; binary redistributions must reproduce it in documentation or other materials.",
  permissions: ["Commercial use", "Modification", "Distribution", "Private use"],
  conditions: [
    "Retain the copyright notice, conditions and disclaimer in source redistributions",
    "Reproduce the copyright notice, conditions and disclaimer in documentation or other materials for binary redistributions",
  ],
  limitations: ["No warranty", "No liability", "No express patent licence"],
  sources: [spdx("BSD-2-Clause"), osi("bsd-2-clause", "The 2-Clause BSD License")],
};

export const BSD_3_CLAUSE: LicenseDefinition = {
  ...permissiveBase,
  id: "BSD-3-Clause",
  name: 'BSD 3-Clause "New" or "Revised" License',
  spdxId: "BSD-3-Clause",
  patentGrant: false,
  patentRetaliation: false,
  trademarkUse: "PROHIBITED",
  stateChangesRequired: false,
  description:
    "The BSD 2-Clause terms plus a clause prohibiting use of the copyright holder's or contributors' names to endorse or promote derived products without permission.",
  permissions: ["Commercial use", "Modification", "Distribution", "Private use"],
  conditions: [
    "Retain the copyright notice, conditions and disclaimer in source redistributions",
    "Reproduce the copyright notice, conditions and disclaimer in documentation or other materials for binary redistributions",
  ],
  limitations: [
    "No warranty",
    "No liability",
    "No express patent licence",
    "Names of the copyright holder or contributors may not be used to endorse or promote derived products without permission",
  ],
  sources: [spdx("BSD-3-Clause"), osi("bsd-3-clause", "The 3-Clause BSD License")],
};

export const APACHE_2_0: LicenseDefinition = {
  ...permissiveBase,
  id: "Apache-2.0",
  name: "Apache License 2.0",
  spdxId: "Apache-2.0",
  patentGrant: true,
  patentRetaliation: true,
  trademarkUse: "PROHIBITED",
  stateChangesRequired: true,
  description:
    "A permissive licence with an express patent licence from contributors (section 3), NOTICE file handling (section 4(d)), change notices for modified files (section 4(b)) and no trademark grant (section 6).",
  permissions: [
    "Commercial use",
    "Modification",
    "Distribution",
    "Sublicensing",
    "Private use",
    "Express patent licence",
  ],
  conditions: [
    "Give recipients a copy of the licence",
    "Cause modified files to carry prominent notices stating that you changed them",
    "Retain copyright, patent, trademark and attribution notices from the source form",
    "If a NOTICE file is included, include its attribution notices in the distribution",
  ],
  limitations: [
    "No warranty",
    "No liability",
    "No trademark rights",
    "Patent licence terminates for a party that initiates patent litigation alleging the work infringes a patent",
  ],
  sources: [
    spdx("Apache-2.0"),
    osi("apache-2-0", "Apache License, Version 2.0"),
    official("Apache License, Version 2.0 (official text)", "https://www.apache.org/licenses/LICENSE-2.0"),
  ],
};
