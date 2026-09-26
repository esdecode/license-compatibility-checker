// Engine
export { checkCompatibility, SCENARIO_DEFAULTS, SCENARIO_LABELS, isScenario } from "./compatibility/engine.js";
export { analyzeProject } from "./project/analyzer.js";
export { analyzeSourceCodeAcquisition } from "./acquisition/analyzer.js";

// Knowledge base
export { getLicense, getLicenses, getLicenseById, isKnownLicenseId, normalizeLicense } from "./licenses/index.js";

// Dependency manifests
export { parseManifest, getPackageParser, PACKAGE_PARSERS } from "./packages/parsers/index.js";
export { resolveLicenseExpression, declaredLicenseResolver } from "./packages/resolver.js";
export { parseSpdxExpression, SpdxExpressionError } from "./packages/spdx-expression.js";
export type { SpdxNode } from "./packages/spdx-expression.js";
export { UnsupportedManifestError } from "./packages/types.js";
export type {
  Dependency,
  DependencyResolver,
  Ecosystem,
  LicenseEvidence,
  LicenseResolver,
  ManifestKind,
  PackageParser,
  ParsedManifest,
  ResolvedLicense,
} from "./packages/types.js";

export { DISCLAIMER } from "./utils/index.js";

// Types and enumerations
export { LICENSE_IDS, SCENARIOS, COMPATIBILITY_STATUSES, DIMENSION_KEYS } from "./types/index.js";
export type * from "./types/index.js";
