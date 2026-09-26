import type { LicenseDefinition } from "../../types/index.js";
import { spdx, vendor } from "../sources/index.js";

const sourceAvailableBase = {
  category: "SOURCE_AVAILABLE",
  family: "SOURCE_AVAILABLE",
  osiApproved: false,
  fsfGplCompatible: false,
  privateUse: "PERMITTED",
  modification: "PERMITTED",
  attributionRequired: true,
  licenseNoticeRequired: true,
  copyrightNoticeRequired: true,
} as const;

export const BUSL_1_1: LicenseDefinition = {
  ...sourceAvailableBase,
  id: "BUSL-1.1",
  name: "Business Source License 1.1",
  spdxId: "BUSL-1.1",
  commercialUse: "CONDITIONAL",
  distribution: "CONDITIONAL",
  sublicensing: "UNKNOWN",
  patentGrant: null,
  patentRetaliation: null,
  trademarkUse: "PROHIBITED",
  sourceDisclosure: "NONE",
  copyleft: "NONE",
  networkCopyleft: false,
  sameLicenseRequired: true,
  stateChangesRequired: false,
  description:
    "A source-available licence. Copying, modification, redistribution and non-production use are permitted; production use is permitted only as allowed by the licensor's Additional Use Grant. On the Change Date the work becomes available under the specified Change License.",
  permissions: ["Copying", "Modification", "Redistribution", "Non-production use"],
  conditions: [
    "Production use only as permitted by the Additional Use Grant",
    "Each copy must carry the Business Source License with the licensor's parameters",
  ],
  limitations: [
    "Not an open-source licence",
    "Parameters (Additional Use Grant, Change Date, Change License) vary per product",
  ],
  restrictions: ["Production use outside the Additional Use Grant requires a commercial licence from the licensor"],
  sources: [spdx("BUSL-1.1"), vendor("MariaDB: Business Source License 1.1", "https://mariadb.com/bsl11/")],
};

export const SSPL_1_0: LicenseDefinition = {
  ...sourceAvailableBase,
  id: "SSPL-1.0",
  name: "Server Side Public License v1",
  spdxId: "SSPL-1.0",
  commercialUse: "CONDITIONAL",
  distribution: "PERMITTED",
  sublicensing: "PROHIBITED",
  patentGrant: true,
  patentRetaliation: true,
  trademarkUse: "UNKNOWN",
  sourceDisclosure: "SERVICE_STACK",
  copyleft: "NETWORK",
  networkCopyleft: true,
  sameLicenseRequired: true,
  stateChangesRequired: true,
  description:
    "A source-available licence based on AGPL-3.0. Section 13 requires that anyone offering the program's functionality as a service to third parties make the Service Source Code (including management, user interface, APIs, automation, monitoring, backup and hosting software) available under SSPL.",
  permissions: ["Modification", "Distribution", "Private use"],
  conditions: [
    "License conveyed works under SSPL-1.0 with Corresponding Source",
    "When offering the functionality as a service, release the Service Source Code under SSPL (section 13)",
  ],
  limitations: ["Not an open-source licence (not OSI approved)", "No warranty", "No liability"],
  restrictions: ["Offering the software as a service triggers release of the entire service stack source"],
  sources: [
    spdx("SSPL-1.0"),
    vendor("MongoDB: Server Side Public License", "https://www.mongodb.com/legal/licensing/server-side-public-license"),
  ],
};

export const ELASTIC_2_0: LicenseDefinition = {
  ...sourceAvailableBase,
  id: "Elastic-2.0",
  name: "Elastic License 2.0",
  spdxId: "Elastic-2.0",
  commercialUse: "CONDITIONAL",
  distribution: "CONDITIONAL",
  sublicensing: "PROHIBITED",
  patentGrant: true,
  patentRetaliation: true,
  trademarkUse: "PROHIBITED",
  sourceDisclosure: "NONE",
  copyleft: "NONE",
  networkCopyleft: false,
  sameLicenseRequired: true,
  stateChangesRequired: false,
  description:
    "A source-available licence permitting use, copying, distribution and derivative works, subject to three limitations: no providing the software to third parties as a hosted or managed service giving access to a substantial set of its features, no circumventing licence key functionality, and no removing or obscuring licensing notices.",
  permissions: ["Use", "Copying", "Distribution", "Derivative works", "Express patent licence"],
  conditions: ["Pass the licence terms to anyone receiving a copy", "Keep licensing, copyright and other notices"],
  limitations: ["Not an open-source licence", "No warranty", "No liability", "No trademark rights"],
  restrictions: [
    "May not provide the software as a hosted or managed service with access to a substantial set of its features",
    "May not move, change, disable or circumvent licence key functionality",
    "May not alter, remove or obscure licensing, copyright or other notices",
  ],
  sources: [
    spdx("Elastic-2.0"),
    vendor("Elastic: Elastic License 2.0", "https://www.elastic.co/licensing/elastic-license"),
  ],
};
