import { describe, expect, it } from "vitest";
import { getLicense, getLicenses, LICENSE_IDS, normalizeLicense } from "../../src/index.js";

describe("licence knowledge base", () => {
  it("contains every advertised licence", () => {
    expect(getLicenses().map((license) => license.id)).toEqual([...LICENSE_IDS]);
  });

  it("every licence has https source references", () => {
    for (const license of getLicenses()) {
      expect(license.sources.length, license.id).toBeGreaterThan(0);
      for (const source of license.sources) expect(source.url, license.id).toMatch(/^https:\/\//);
    }
  });

  it("every licence with an SPDX id cites the SPDX entry", () => {
    for (const license of getLicenses().filter((l) => l.spdxId)) {
      expect(
        license.sources.some((s) => s.url === `https://spdx.org/licenses/${license.spdxId}.html`),
        license.id,
      ).toBe(true);
    }
  });

  it("GNU licences cite gnu.org and OSI-approved licences cite opensource.org", () => {
    for (const id of ["GPL-2.0", "GPL-3.0", "LGPL-2.1", "LGPL-3.0", "AGPL-3.0"]) {
      expect(
        getLicense(id).sources.some((s) => s.url.startsWith("https://www.gnu.org/")),
        id,
      ).toBe(true);
    }
    for (const license of getLicenses().filter((l) => l.osiApproved)) {
      expect(
        license.sources.some((s) => s.url.startsWith("https://opensource.org/")),
        license.id,
      ).toBe(true);
    }
  });

  it("copyleft is an enum, not a boolean", () => {
    expect(getLicense("MIT").copyleft).toBe("NONE");
    expect(getLicense("MPL-2.0").copyleft).toBe("FILE_LEVEL");
    expect(getLicense("LGPL-3.0").copyleft).toBe("WEAK");
    expect(getLicense("GPL-3.0").copyleft).toBe("STRONG");
    expect(getLicense("AGPL-3.0").copyleft).toBe("NETWORK");
  });

  it("distinguishes licence categories", () => {
    expect(getLicense("MIT").category).toBe("OPEN_SOURCE");
    expect(getLicense("CC0-1.0").category).toBe("PUBLIC_DOMAIN_EQUIVALENT");
    expect(getLicense("SSPL-1.0").category).toBe("SOURCE_AVAILABLE");
    expect(getLicense("Proprietary").category).toBe("PROPRIETARY");
    expect(getLicense("Unknown").category).toBe("UNKNOWN");
    for (const id of ["BUSL-1.1", "SSPL-1.0", "Elastic-2.0"]) expect(getLicense(id).osiApproved, id).toBe(false);
  });

  it("proprietary, unknown and custom licences never claim known permissions", () => {
    for (const id of ["Proprietary", "Unknown", "Custom"]) {
      const license = getLicense(id);
      expect(license.commercialUse).toBe("UNKNOWN");
      expect(license.distribution).toBe("UNKNOWN");
      expect(license.patentGrant).toBeNull();
    }
  });
});

describe("normalizeLicense", () => {
  it.each([
    ["MIT", "MIT"],
    ["mit", "MIT"],
    ["The MIT License", "MIT"],
    ["Apache 2.0", "Apache-2.0"],
    ["BSD-3-Clause", "BSD-3-Clause"],
    ["GPL-3.0-only", "GPL-3.0"],
    ["GPLv3", "GPL-3.0"],
    ["AGPL-3.0-or-later", "AGPL-3.0"],
    ["LGPL-2.1+", "LGPL-2.1"],
    ["BSL-1.1", "BUSL-1.1"],
    ["BUSL-1.1", "BUSL-1.1"],
    ["PROPRIETARY", "Proprietary"],
    ["UNLICENSED", "Proprietary"],
    ["Unlicense", "Unlicense"],
    ["SEE LICENSE IN LICENSE", "Custom"],
    ["GPL-2.0-with-classpath-exception", "Custom"],
  ])("%s -> %s", (input, id) => {
    expect(normalizeLicense(input).id).toBe(id);
  });

  it("keeps the GNU version option", () => {
    expect(normalizeLicense("GPL-2.0-or-later").orLater).toBe(true);
    expect(normalizeLicense("GPL-2.0+").orLater).toBe(true);
    expect(normalizeLicense("GPL-2.0-only").orLater).toBe(false);
    expect(normalizeLicense("GPL-2.0").versionOptionUnspecified).toBe(true);
  });

  it("never guesses", () => {
    for (const input of ["", "   ", "BSL-1.0", "MIT-ish", "Apache", "GPL", "WTFPL"]) {
      const normalized = normalizeLicense(input);
      expect(normalized.id, input).toBe("Unknown");
      expect(normalized.recognized, input).toBe(false);
    }
  });
});
