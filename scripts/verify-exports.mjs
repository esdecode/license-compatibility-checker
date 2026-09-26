// Verifies the built package through its public "exports" entry, exactly as a consumer imports it.
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const api = await import("@esdecode/license-checker");

const expected = [
  "checkCompatibility",
  "analyzeProject",
  "analyzeSourceCodeAcquisition",
  "getLicense",
  "getLicenses",
  "normalizeLicense",
  "parseManifest",
  "resolveLicenseExpression",
  "LICENSE_IDS",
  "SCENARIOS",
  "DISCLAIMER",
];
const missing = expected.filter((name) => !(name in api));
if (missing.length) throw new Error(`Missing exports: ${missing.join(", ")}`);

const forbidden = ["react", "react-dom", "next"];
const deps = { ...pkg.dependencies, ...pkg.peerDependencies };
const bad = forbidden.filter((name) => name in deps);
if (bad.length) throw new Error(`Framework dependencies are not allowed: ${bad.join(", ")}`);
if (Object.keys(pkg.dependencies ?? {}).length) throw new Error("The package must have zero runtime dependencies.");

// README examples
const assert = (actual, expectedValue, label) => {
  if (actual !== expectedValue) throw new Error(`${label}: expected ${expectedValue}, got ${actual}`);
};
assert(
  api.checkCompatibility({ licenseA: "GPL-3.0", licenseB: "Proprietary", scenario: "PROPRIETARY_SOFTWARE" }).status,
  "LIKELY_INCOMPATIBLE",
  "README quick start",
);
assert(
  api.checkCompatibility({ licenseA: "GPL-3.0", licenseB: "Proprietary", scenario: "SAAS" }).status,
  "COMPATIBLE_WITH_CONDITIONS",
  "README GPL SaaS",
);
assert(
  api.analyzeProject({ licenses: ["MIT", "Apache-2.0", "BSD-3-Clause", "GPL-3.0", "PROPRIETARY"] }).overallRisk,
  "HIGH",
  "README analyzeProject",
);

console.log(`OK: ${Object.keys(api).length} exports, no runtime or framework dependencies, README examples hold.`);

// CommonJS consumers on Node 22+ load the ESM build through require(esm) via the "default" condition.
const { createRequire } = await import("node:module");
const required = createRequire(import.meta.url)("@esdecode/license-checker");
if (typeof required.checkCompatibility !== "function") throw new Error("require() consumers cannot load the package");
console.log("OK: require() resolves the package.");
