export type Ecosystem = "npm" | "composer";

export type ManifestKind =
  "package.json" | "package-lock.json" | "composer.json" | "composer.lock" | "yarn.lock" | "pnpm-lock.yaml";

/** How the licence value of a dependency was obtained. Nothing is ever inferred from package names. */
export type LicenseEvidence = "DECLARED_IN_LOCKFILE" | "DECLARED_IN_MANIFEST" | "NOT_AVAILABLE";

export interface Dependency {
  name: string;
  /** Exact version for lockfiles; version range for manifests. */
  version: string;
  ecosystem: Ecosystem;
  direct: boolean;
  dev: boolean;
  /** Declared SPDX expression exactly as found, or null when the file does not contain one. */
  declaredLicense: string | null;
  licenseEvidence: LicenseEvidence;
}

export interface ParsedManifest {
  kind: ManifestKind;
  ecosystem: Ecosystem;
  /** Licence declared by the root project itself, if present. */
  projectLicense: string | null;
  dependencies: Dependency[];
  warnings: string[];
}

export interface PackageParser {
  kind: ManifestKind;
  /** Returns true when the file name (and optionally content) matches this parser. */
  matches(fileName: string): boolean;
  parse(content: string): ParsedManifest;
}

/** Resolves dependencies (e.g. transitive ones) from a registry. Not implemented in this package. */
export interface DependencyResolver {
  resolve(dependencies: readonly Dependency[]): Promise<Dependency[]>;
}

export type ResolvedLicense =
  | { status: "RESOLVED"; expression: string; licenseIds: string[]; operator: "SINGLE" | "AND" | "OR" | "COMPLEX" }
  | { status: "UNKNOWN"; expression: string | null; reason: string };

/** Turns a dependency's declared licence into licence ids understood by the engine. */
export interface LicenseResolver {
  resolve(dependency: Dependency): ResolvedLicense;
}

export class UnsupportedManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedManifestError";
  }
}
