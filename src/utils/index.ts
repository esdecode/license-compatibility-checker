import type { LicenseDefinition, LicenseSource, NormalizedLicense } from "../types/index.js";

export const DISCLAIMER =
  "This library provides general software licensing information and is not legal advice. License obligations can depend on how software is combined, modified, distributed and used. High-risk or ambiguous cases should be reviewed against the actual license text and, where appropriate, by qualified legal counsel.";

export function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

export function uniqueSources(sources: readonly LicenseSource[]): LicenseSource[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (seen.has(source.url)) return false;
    seen.add(source.url);
    return true;
  });
}

/** Stable rule-id prefix for a licence, e.g. "GPL" for GPL-3.0, "APACHE" for Apache-2.0. */
export function rulePrefix(license: LicenseDefinition): string {
  const head = license.id.split("-")[0] ?? license.id;
  return head.toUpperCase();
}

/** Human label for a normalized licence, preserving the GNU version option. */
export function licenseLabel(license: LicenseDefinition, normalized?: NormalizedLicense): string {
  if (license.id === "Unknown" && normalized && !normalized.recognized && normalized.input.trim()) {
    return `"${normalized.input.trim()}" (unrecognized)`;
  }
  if (normalized?.orLater) return `${license.id}-or-later`;
  return license.id;
}

export const isGnu = (license: LicenseDefinition): boolean =>
  ["GPL-2.0", "GPL-3.0", "LGPL-2.1", "LGPL-3.0", "AGPL-3.0"].includes(license.id);

export const isPermissiveOrPublicDomain = (license: LicenseDefinition): boolean =>
  license.family === "PERMISSIVE" || license.family === "PUBLIC_DOMAIN";

export const hasStrongCopyleft = (license: LicenseDefinition): boolean =>
  license.copyleft === "STRONG" || license.copyleft === "NETWORK";

export const isUnresolved = (license: LicenseDefinition): boolean =>
  license.id === "Unknown" || license.id === "Custom";
