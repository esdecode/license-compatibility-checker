import type { Dependency, PackageParser, ParsedManifest } from "../types.js";
import { UnsupportedManifestError } from "../types.js";
import { asRecord, asString, declaredLicense, parseJsonObject } from "./json.js";

const baseName = (fileName: string) => fileName.replace(/\\/g, "/").split("/").pop() ?? fileName;

export const packageJsonParser: PackageParser = {
  kind: "package.json",
  matches: (fileName) => baseName(fileName) === "package.json",
  parse(content) {
    const json = parseJsonObject(content, "package.json");
    const dependencies: Dependency[] = [];
    const groups: [string, boolean][] = [
      ["dependencies", false],
      ["optionalDependencies", false],
      ["peerDependencies", false],
      ["devDependencies", true],
    ];
    const seen = new Set<string>();
    for (const [field, dev] of groups) {
      for (const [name, range] of Object.entries(asRecord(json[field]))) {
        if (seen.has(name)) continue;
        seen.add(name);
        dependencies.push({
          name,
          version: asString(range) ?? "*",
          ecosystem: "npm",
          direct: true,
          dev,
          declaredLicense: null,
          licenseEvidence: "NOT_AVAILABLE",
        });
      }
    }
    return {
      kind: "package.json",
      ecosystem: "npm",
      projectLicense: declaredLicense(json.license ?? json.licenses),
      dependencies,
      warnings: dependencies.length
        ? [
            "package.json lists version ranges only; dependency licences are not available without a lockfile or registry lookup.",
          ]
        : [],
    };
  },
};

/** package-lock.json v2/v3 ("packages" map). npm records the declared licence of each installed package. */
export const packageLockParser: PackageParser = {
  kind: "package-lock.json",
  matches: (fileName) => baseName(fileName) === "package-lock.json" || baseName(fileName) === "npm-shrinkwrap.json",
  parse(content) {
    const json = parseJsonObject(content, "package-lock.json");
    const packages = asRecord(json.packages);
    if (!Object.keys(packages).length) {
      throw new UnsupportedManifestError(
        'package-lock.json v1 (no "packages" map) is not supported; regenerate it with npm 7 or later.',
      );
    }
    const root = asRecord(packages[""]);
    const directNames = new Set([
      ...Object.keys(asRecord(root.dependencies)),
      ...Object.keys(asRecord(root.devDependencies)),
      ...Object.keys(asRecord(root.optionalDependencies)),
      ...Object.keys(asRecord(root.peerDependencies)),
    ]);
    const warnings: string[] = [];
    const dependencies: Dependency[] = [];

    for (const [path, raw] of Object.entries(packages)) {
      if (!path) continue;
      const entry = asRecord(raw);
      if (entry.link === true) continue; // workspace symlink; the target entry is listed separately
      const name = asString(entry.name) ?? path.split("node_modules/").pop() ?? path;
      const version = asString(entry.version);
      if (!version) {
        warnings.push(`Skipped ${path}: no version recorded.`);
        continue;
      }
      const license = declaredLicense(entry.license);
      dependencies.push({
        name,
        version,
        ecosystem: "npm",
        direct: directNames.has(name) && path === `node_modules/${name}`,
        dev: entry.dev === true,
        declaredLicense: license,
        licenseEvidence: license ? "DECLARED_IN_LOCKFILE" : "NOT_AVAILABLE",
      });
    }

    return {
      kind: "package-lock.json",
      ecosystem: "npm",
      projectLicense: declaredLicense(root.license),
      dependencies,
      warnings,
    } satisfies ParsedManifest;
  },
};
