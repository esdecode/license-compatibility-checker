import type { Dependency, PackageParser } from "../types.js";
import { UnsupportedManifestError } from "../types.js";

const baseName = (fileName: string) => fileName.replace(/\\/g, "/").split("/").pop() ?? fileName;

/** Package name from a yarn v1 descriptor such as `"@scope/pkg@^1.0.0"` or `pkg@npm:1.2.3`. */
function nameFromDescriptor(descriptor: string): string | null {
  const clean = descriptor.trim().replace(/^"|"$/g, "");
  const at = clean.lastIndexOf("@");
  if (at <= 0) return null;
  return clean.slice(0, at);
}

/**
 * yarn.lock v1 (classic). Records names and resolved versions only; it contains no licence data,
 * so every dependency is returned with licenseEvidence NOT_AVAILABLE.
 * Yarn Berry (v2+) lockfiles are YAML and are rejected rather than parsed approximately.
 */
export const yarnLockParser: PackageParser = {
  kind: "yarn.lock",
  matches: (fileName) => baseName(fileName) === "yarn.lock",
  parse(content) {
    if (/^__metadata:/m.test(content)) {
      throw new UnsupportedManifestError(
        "Yarn Berry (v2+) lockfiles are not supported yet; only yarn.lock v1 can be parsed.",
      );
    }
    const dependencies: Dependency[] = [];
    const seen = new Set<string>();
    let currentNames: string[] = [];

    for (const line of content.split(/\r?\n/)) {
      if (!line.trim() || line.startsWith("#")) continue;
      if (!line.startsWith(" ") && line.trimEnd().endsWith(":")) {
        currentNames = line
          .trimEnd()
          .slice(0, -1)
          .split(",")
          .map(nameFromDescriptor)
          .filter((name): name is string => !!name);
        continue;
      }
      const version = line.match(/^ {2}version:? "?([^"\s]+)"?/);
      if (version?.[1] && currentNames.length) {
        const name = currentNames[0] as string;
        const key = `${name}@${version[1]}`;
        if (!seen.has(key)) {
          seen.add(key);
          dependencies.push({
            name,
            version: version[1],
            ecosystem: "npm",
            direct: false,
            dev: false,
            declaredLicense: null,
            licenseEvidence: "NOT_AVAILABLE",
          });
        }
        currentNames = [];
      }
    }

    return {
      kind: "yarn.lock",
      ecosystem: "npm",
      projectLicense: null,
      dependencies,
      warnings: ["yarn.lock contains no licence information; licences require a registry lookup (not performed)."],
    };
  },
};
