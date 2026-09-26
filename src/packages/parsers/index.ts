import type { PackageParser, ParsedManifest } from "../types.js";
import { UnsupportedManifestError } from "../types.js";
import { composerJsonParser, composerLockParser } from "./composer.js";
import { packageJsonParser, packageLockParser } from "./npm.js";
import { yarnLockParser } from "./yarn.js";

export { composerJsonParser, composerLockParser, packageJsonParser, packageLockParser, yarnLockParser };

export const PACKAGE_PARSERS: readonly PackageParser[] = [
  packageJsonParser,
  packageLockParser,
  composerJsonParser,
  composerLockParser,
  yarnLockParser,
];

export function getPackageParser(fileName: string): PackageParser | null {
  return PACKAGE_PARSERS.find((parser) => parser.matches(fileName)) ?? null;
}

/**
 * Parse a dependency manifest or lockfile by file name.
 * pnpm-lock.yaml and Yarn Berry lockfiles are not supported yet and raise UnsupportedManifestError.
 */
export function parseManifest(fileName: string, content: string): ParsedManifest {
  const parser = getPackageParser(fileName);
  if (!parser)
    throw new UnsupportedManifestError(
      `No parser for "${fileName}". Supported: ${PACKAGE_PARSERS.map((p) => p.kind).join(", ")}.`,
    );
  return parser.parse(content);
}
