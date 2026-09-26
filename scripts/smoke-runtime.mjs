// Runtime smoke test for the built package on the oldest supported Node.js versions.
// Uses no dev dependencies, so it can run where the test tooling (Vitest, ESLint) cannot.
const api = await import("../dist/index.js");

const cases = [
  [{ licenseA: "MIT", licenseB: "Proprietary", scenario: "PROPRIETARY_SOFTWARE" }, "GENERALLY_COMPATIBLE"],
  [{ licenseA: "GPL-3.0", licenseB: "Proprietary", scenario: "PROPRIETARY_SOFTWARE" }, "LIKELY_INCOMPATIBLE"],
  [{ licenseA: "GPL-3.0", licenseB: "Proprietary", scenario: "SAAS" }, "COMPATIBLE_WITH_CONDITIONS"],
  [{ licenseA: "Unknown", licenseB: "MIT", scenario: "DEPENDENCY" }, "UNKNOWN"],
];
for (const [input, expected] of cases) {
  const status = api.checkCompatibility(input).status;
  if (status !== expected)
    throw new Error(`${input.licenseA} -> ${input.licenseB}: expected ${expected}, got ${status}`);
}

const project = api.analyzeProject({ licenses: ["MIT", "Apache-2.0", "GPL-3.0", "PROPRIETARY"] });
if (project.overallRisk !== "HIGH") throw new Error(`analyzeProject: expected HIGH, got ${project.overallRisk}`);

const report = api.analyzeSourceCodeAcquisition({
  mainProjectLicense: "Proprietary",
  thirdPartyLicenses: ["MIT"],
  commercialUse: true,
  saas: false,
  redistribution: false,
  modification: true,
  whiteLabel: false,
  resale: false,
});
if (!report.sellerQuestions.length) throw new Error("analyzeSourceCodeAcquisition returned no seller questions");

const manifest = api.parseManifest("package.json", JSON.stringify({ license: "MIT", dependencies: { a: "1" } }));
if (manifest.projectLicense !== "MIT") throw new Error("parseManifest failed");

console.log(`OK: runtime smoke test passed on Node ${process.version}`);
