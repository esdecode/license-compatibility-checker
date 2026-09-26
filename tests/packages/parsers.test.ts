import { describe, expect, it } from "vitest";
import {
  declaredLicenseResolver,
  parseManifest,
  parseSpdxExpression,
  resolveLicenseExpression,
  UnsupportedManifestError,
} from "../../src/index.js";

describe("package.json", () => {
  it("lists direct dependencies without guessing licences", () => {
    const manifest = parseManifest(
      "app/package.json",
      JSON.stringify({ license: "MIT", dependencies: { react: "^19.0.0" }, devDependencies: { vitest: "^4.0.0" } }),
    );
    expect(manifest.projectLicense).toBe("MIT");
    expect(manifest.dependencies).toEqual([
      expect.objectContaining({
        name: "react",
        dev: false,
        direct: true,
        declaredLicense: null,
        licenseEvidence: "NOT_AVAILABLE",
      }),
      expect.objectContaining({ name: "vitest", dev: true }),
    ]);
    expect(declaredLicenseResolver.resolve(manifest.dependencies[0]!)).toMatchObject({ status: "UNKNOWN" });
  });

  it("accepts a UTF-8 byte order mark", () => {
    expect(
      parseManifest("package.json", String.fromCharCode(0xfeff) + JSON.stringify({ license: "ISC" })).projectLicense,
    ).toBe("ISC");
  });

  it("does not strip other leading text", () => {
    expect(() => parseManifest("package.json", `FEFF${JSON.stringify({ license: "ISC" })}`)).toThrow(
      UnsupportedManifestError,
    );
  });
});

describe("package-lock.json", () => {
  const lock = {
    lockfileVersion: 3,
    packages: {
      "": {
        name: "app",
        license: "UNLICENSED",
        dependencies: { lodash: "^4.17.21" },
        devDependencies: { typescript: "^5" },
      },
      "node_modules/lodash": { version: "4.17.21", license: "MIT" },
      "node_modules/typescript": { version: "5.9.3", license: "Apache-2.0", dev: true },
      "node_modules/nested/node_modules/lodash": { version: "3.0.0" },
      "packages/local": { link: true },
    },
  };

  it("reads declared licences from the lockfile", () => {
    const manifest = parseManifest("package-lock.json", JSON.stringify(lock));
    expect(manifest.projectLicense).toBe("UNLICENSED");
    const lodash = manifest.dependencies.find((d) => d.version === "4.17.21");
    expect(lodash).toMatchObject({
      name: "lodash",
      direct: true,
      declaredLicense: "MIT",
      licenseEvidence: "DECLARED_IN_LOCKFILE",
    });
    expect(manifest.dependencies.find((d) => d.name === "typescript")?.dev).toBe(true);
    const nested = manifest.dependencies.find((d) => d.version === "3.0.0");
    expect(nested).toMatchObject({
      name: "lodash",
      direct: false,
      declaredLicense: null,
      licenseEvidence: "NOT_AVAILABLE",
    });
    expect(manifest.dependencies).toHaveLength(3);
  });

  it("rejects lockfile v1 instead of parsing it approximately", () => {
    expect(() => parseManifest("package-lock.json", JSON.stringify({ lockfileVersion: 1, dependencies: {} }))).toThrow(
      UnsupportedManifestError,
    );
  });

  it("rejects invalid JSON", () => {
    expect(() => parseManifest("package-lock.json", "{nope")).toThrow(UnsupportedManifestError);
  });
});

describe("composer", () => {
  it("composer.json ignores platform requirements", () => {
    const manifest = parseManifest(
      "composer.json",
      JSON.stringify({
        license: "proprietary",
        require: { php: "^8.2", "ext-json": "*", "laravel/framework": "^11.0" },
        "require-dev": { "phpunit/phpunit": "^11" },
      }),
    );
    expect(manifest.projectLicense).toBe("proprietary");
    expect(manifest.dependencies.map((d) => d.name)).toEqual(["laravel/framework", "phpunit/phpunit"]);
  });

  it("composer.lock licence arrays are OR expressions", () => {
    const manifest = parseManifest(
      "composer.lock",
      JSON.stringify({
        packages: [
          { name: "monolog/monolog", version: "3.5.0", license: ["MIT"] },
          { name: "dual/pkg", version: "1.0.0", license: ["GPL-2.0-or-later", "MIT"] },
          { name: "nolicense/pkg", version: "1.0.0" },
        ],
        "packages-dev": [{ name: "phpunit/phpunit", version: "11.0.0", license: ["BSD-3-Clause"] }],
      }),
    );
    expect(manifest.dependencies.map((d) => d.declaredLicense)).toEqual([
      "MIT",
      "(GPL-2.0-or-later OR MIT)",
      null,
      "BSD-3-Clause",
    ]);
    expect(declaredLicenseResolver.resolve(manifest.dependencies[1]!)).toMatchObject({
      status: "RESOLVED",
      operator: "OR",
      licenseIds: ["GPL-2.0-or-later", "MIT"],
    });
    expect(declaredLicenseResolver.resolve(manifest.dependencies[2]!)).toMatchObject({ status: "UNKNOWN" });
    expect(manifest.dependencies[3]?.dev).toBe(true);
  });
});

describe("yarn.lock and pnpm", () => {
  it("parses yarn v1 names and versions, with no licence data", () => {
    const content = `# yarn lockfile v1\n\n"@babel/core@^7.0.0", "@babel/core@^7.1.0":\n  version "7.24.0"\n  resolved "https://registry.yarnpkg.com/x"\n\nlodash@^4.17.21:\n  version "4.17.21"\n`;
    const manifest = parseManifest("yarn.lock", content);
    expect(manifest.dependencies.map((d) => `${d.name}@${d.version}`)).toEqual([
      "@babel/core@7.24.0",
      "lodash@4.17.21",
    ]);
    expect(manifest.dependencies.every((d) => d.licenseEvidence === "NOT_AVAILABLE")).toBe(true);
  });

  it("rejects Yarn Berry and pnpm lockfiles", () => {
    expect(() => parseManifest("yarn.lock", "__metadata:\n  version: 6\n")).toThrow(UnsupportedManifestError);
    expect(() => parseManifest("pnpm-lock.yaml", "lockfileVersion: '9.0'\n")).toThrow(UnsupportedManifestError);
  });
});

describe("SPDX expressions", () => {
  it("respects operator precedence", () => {
    expect(parseSpdxExpression("MIT OR Apache-2.0 AND BSD-3-Clause")).toEqual({
      type: "or",
      left: { type: "license", id: "MIT" },
      right: {
        type: "and",
        left: { type: "license", id: "Apache-2.0" },
        right: { type: "license", id: "BSD-3-Clause" },
      },
    });
  });

  it.each([
    ["MIT", "RESOLVED", "SINGLE", ["MIT"]],
    ["(MIT OR Apache-2.0)", "RESOLVED", "OR", ["MIT", "Apache-2.0"]],
    ["MIT AND BSD-3-Clause", "RESOLVED", "AND", ["MIT", "BSD-3-Clause"]],
    ["(MIT OR GPL-3.0) AND BSD-2-Clause", "RESOLVED", "COMPLEX", ["MIT", "GPL-3.0", "BSD-2-Clause"]],
    ["GPL-2.0-only WITH Classpath-exception-2.0", "RESOLVED", "SINGLE", ["Custom"]],
    ["LicenseRef-Acme", "RESOLVED", "SINGLE", ["Custom"]],
  ])("%s", (expression, status, operator, licenseIds) => {
    expect(resolveLicenseExpression(expression)).toEqual({ status, expression, operator, licenseIds });
  });

  it.each([null, "", "MIT OR", "(MIT", "FooBar-1.0", "MIT AND FooBar-1.0"])("%s is UNKNOWN", (expression) => {
    expect(resolveLicenseExpression(expression).status).toBe("UNKNOWN");
  });

  it("accepts a free-text alias as a single licence", () => {
    expect(resolveLicenseExpression("Apache License 2.0")).toMatchObject({
      status: "RESOLVED",
      licenseIds: ["Apache License 2.0"],
    });
  });
});
