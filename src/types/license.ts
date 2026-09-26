/** Identifiers of the licenses shipped with the knowledge base (SPDX where one exists). */
export const LICENSE_IDS = [
  "MIT",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "MPL-2.0",
  "LGPL-2.1",
  "LGPL-3.0",
  "GPL-2.0",
  "GPL-3.0",
  "AGPL-3.0",
  "EPL-2.0",
  "CDDL-1.0",
  "Unlicense",
  "CC0-1.0",
  "BUSL-1.1",
  "SSPL-1.0",
  "Elastic-2.0",
  "Proprietary",
  "Unknown",
  "Custom",
] as const;

export type LicenseId = (typeof LICENSE_IDS)[number];

/** What kind of licence this is. Source-available licences are not open source. */
export type LicenseCategory =
  "OPEN_SOURCE" | "SOURCE_AVAILABLE" | "PUBLIC_DOMAIN_EQUIVALENT" | "PROPRIETARY" | "UNKNOWN";

export type LicenseFamily =
  | "PERMISSIVE"
  | "WEAK_COPYLEFT"
  | "FILE_LEVEL_COPYLEFT"
  | "STRONG_COPYLEFT"
  | "NETWORK_COPYLEFT"
  | "PUBLIC_DOMAIN"
  | "SOURCE_AVAILABLE"
  | "PROPRIETARY"
  | "UNKNOWN";

/**
 * Copyleft strength.
 * - NONE: no reciprocal obligation.
 * - FILE_LEVEL: reciprocity limited to the licensed files (MPL-2.0, CDDL-1.0).
 * - WEAK: reciprocity limited to the library/module and its modifications (LGPL, EPL-2.0).
 * - STRONG: reciprocity extends to the whole distributed work based on it (GPL).
 * - NETWORK: STRONG plus obligations triggered by remote network interaction (AGPL-3.0, SSPL-1.0).
 */
export type CopyleftStrength = "NONE" | "WEAK" | "FILE_LEVEL" | "STRONG" | "NETWORK";

/** Tri-state permission. UNKNOWN is used whenever the terms are not known to the knowledge base. */
export type Permission = "PERMITTED" | "CONDITIONAL" | "PROHIBITED" | "UNKNOWN";

/** Scope of source code that must be made available when the obligation is triggered. */
export type SourceDisclosureScope =
  | "NONE"
  | "MODIFIED_FILES"
  | "LIBRARY_AND_MODIFICATIONS"
  | "MODULE_AND_MODIFICATIONS"
  | "DERIVATIVE_WORK"
  | "SERVICE_STACK"
  | "UNKNOWN";

export type SourceKind = "SPDX" | "OSI" | "FSF" | "OFFICIAL_TEXT" | "VENDOR" | "FAQ";

export interface LicenseSource {
  title: string;
  url: string;
  kind: SourceKind;
}

/** Yes/no fact that may be unknown (null) for proprietary, custom or unknown licences. */
export type Fact = boolean | null;

export interface LicenseDefinition {
  id: LicenseId;
  name: string;
  /** SPDX identifier, or null when SPDX has none (Proprietary, Unknown, Custom). */
  spdxId: string | null;
  category: LicenseCategory;
  family: LicenseFamily;
  osiApproved: Fact;
  /** Whether the FSF lists the licence as compatible with GPL-3.0. null when not evaluated. */
  fsfGplCompatible: Fact;
  commercialUse: Permission;
  privateUse: Permission;
  modification: Permission;
  distribution: Permission;
  sublicensing: Permission;
  /** Express patent licence granted by contributors. */
  patentGrant: Fact;
  /** Patent licence terminates when the licensee initiates patent litigation. */
  patentRetaliation: Fact;
  /** Licence expressly withholds trademark rights. */
  trademarkUse: Permission;
  attributionRequired: Fact;
  licenseNoticeRequired: Fact;
  copyrightNoticeRequired: Fact;
  sourceDisclosure: SourceDisclosureScope;
  copyleft: CopyleftStrength;
  networkCopyleft: Fact;
  /** Distributed covered code (and its modifications) must stay under the same licence. */
  sameLicenseRequired: Fact;
  /** Modified files must carry notices of the changes. */
  stateChangesRequired: Fact;
  description: string;
  permissions: readonly string[];
  conditions: readonly string[];
  limitations: readonly string[];
  /** Usage restrictions specific to source-available / proprietary terms. */
  restrictions: readonly string[];
  sources: readonly LicenseSource[];
}

/** Result of turning a user supplied licence string into a known definition. */
export interface NormalizedLicense {
  input: string;
  id: LicenseId;
  recognized: boolean;
  /** "or later" option for GNU licences (e.g. GPL-2.0-or-later). */
  orLater: boolean;
  /** GNU licence given without "-only"/"-or-later" (deprecated SPDX form). */
  versionOptionUnspecified: boolean;
}
