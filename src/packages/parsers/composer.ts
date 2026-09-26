import type { Dependency, PackageParser } from "../types.js";
import { asRecord, asString, declaredLicense, parseJsonObject } from "./json.js";

const baseName = (fileName: string) => fileName.replace(/\\/g, "/").split("/").pop() ?? fileName;

/** Platform requirements (php, ext-*, lib-*, composer-*) are not packages. */
const isPlatformPackage = (name: string) => name === "php" || /^(ext|lib|composer)-/.test(name) || name === "composer";

export const composerJsonParser: PackageParser = {
  kind: "composer.json",
  matches: (fileName) => baseName(fileName) === "composer.json",
  parse(content) {
    const json = parseJsonObject(content, "composer.json");
    const dependencies: Dependency[] = [];
    for (const [field, dev] of [
      ["require", false],
      ["require-dev", true],
    ] as const) {
      for (const [name, range] of Object.entries(asRecord(json[field]))) {
        if (isPlatformPackage(name)) continue;
        dependencies.push({
          name,
          version: asString(range) ?? "*",
          ecosystem: "composer",
          direct: true,
          dev,
          declaredLicense: null,
          licenseEvidence: "NOT_AVAILABLE",
        });
      }
    }
    return {
      kind: "composer.json",
      ecosystem: "composer",
      projectLicense: declaredLicense(json.license, "OR"),
      dependencies,
      warnings: dependencies.length
        ? ["composer.json lists version constraints only; dependency licences are available in composer.lock."]
        : [],
    };
  },
};

/** composer.lock records each package's declared licence array (composer treats multiple entries as OR). */
export const composerLockParser: PackageParser = {
  kind: "composer.lock",
  matches: (fileName) => baseName(fileName) === "composer.lock",
  parse(content) {
    const json = parseJsonObject(content, "composer.lock");
    const dependencies: Dependency[] = [];
    for (const [field, dev] of [
      ["packages", false],
      ["packages-dev", true],
    ] as const) {
      const list = Array.isArray(json[field]) ? (json[field] as unknown[]) : [];
      for (const raw of list) {
        const entry = asRecord(raw);
        const name = asString(entry.name);
        if (!name) continue;
        const license = declaredLicense(entry.license, "OR");
        dependencies.push({
          name,
          version: asString(entry.version) ?? "unknown",
          ecosystem: "composer",
          direct: false,
          dev,
          declaredLicense: license,
          licenseEvidence: license ? "DECLARED_IN_LOCKFILE" : "NOT_AVAILABLE",
        });
      }
    }
    return {
      kind: "composer.lock",
      ecosystem: "composer",
      projectLicense: null,
      dependencies,
      warnings: [
        "composer.lock does not mark which packages are direct dependencies; combine with composer.json for that.",
      ],
    };
  },
};
