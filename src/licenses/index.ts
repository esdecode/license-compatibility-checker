import type { LicenseDefinition, LicenseId, NormalizedLicense } from "../types/index.js";
import { AGPL_3_0, CDDL_1_0, EPL_2_0, GPL_2_0, GPL_3_0, LGPL_2_1, LGPL_3_0, MPL_2_0 } from "./definitions/copyleft.js";
import { APACHE_2_0, BSD_2_CLAUSE, BSD_3_CLAUSE, ISC, MIT } from "./definitions/permissive.js";
import { CC0_1_0, UNLICENSE } from "./definitions/public-domain.js";
import { BUSL_1_1, ELASTIC_2_0, SSPL_1_0 } from "./definitions/source-available.js";
import { CUSTOM, PROPRIETARY, UNKNOWN } from "./definitions/special.js";

const DEFINITIONS: readonly LicenseDefinition[] = [
  MIT,
  APACHE_2_0,
  BSD_2_CLAUSE,
  BSD_3_CLAUSE,
  ISC,
  MPL_2_0,
  LGPL_2_1,
  LGPL_3_0,
  GPL_2_0,
  GPL_3_0,
  AGPL_3_0,
  EPL_2_0,
  CDDL_1_0,
  UNLICENSE,
  CC0_1_0,
  BUSL_1_1,
  SSPL_1_0,
  ELASTIC_2_0,
  PROPRIETARY,
  UNKNOWN,
  CUSTOM,
];

const BY_ID = new Map<LicenseId, LicenseDefinition>(DEFINITIONS.map((license) => [license.id, license]));

/** GNU licences whose SPDX id carries a version option suffix. */
const GNU_IDS: readonly LicenseId[] = ["GPL-2.0", "GPL-3.0", "LGPL-2.1", "LGPL-3.0", "AGPL-3.0"];

/** Lower-cased alias -> id. Keys are compared after whitespace collapsing. */
const ALIASES: Record<string, LicenseId> = {
  mit: "MIT",
  "mit license": "MIT",
  "the mit license": "MIT",
  expat: "MIT",
  "apache-2.0": "Apache-2.0",
  "apache 2.0": "Apache-2.0",
  "apache-2": "Apache-2.0",
  "apache 2": "Apache-2.0",
  "apache license 2.0": "Apache-2.0",
  "apache license, version 2.0": "Apache-2.0",
  apache2: "Apache-2.0",
  "bsd-2-clause": "BSD-2-Clause",
  "bsd 2-clause": "BSD-2-Clause",
  "simplified bsd": "BSD-2-Clause",
  freebsd: "BSD-2-Clause",
  "bsd-3-clause": "BSD-3-Clause",
  "bsd 3-clause": "BSD-3-Clause",
  "new bsd": "BSD-3-Clause",
  "revised bsd": "BSD-3-Clause",
  isc: "ISC",
  "isc license": "ISC",
  "mpl-2.0": "MPL-2.0",
  "mpl 2.0": "MPL-2.0",
  "mozilla public license 2.0": "MPL-2.0",
  "epl-2.0": "EPL-2.0",
  "eclipse public license 2.0": "EPL-2.0",
  "cddl-1.0": "CDDL-1.0",
  unlicense: "Unlicense",
  "the unlicense": "Unlicense",
  "cc0-1.0": "CC0-1.0",
  cc0: "CC0-1.0",
  "busl-1.1": "BUSL-1.1",
  "bsl-1.1": "BUSL-1.1",
  "business source license 1.1": "BUSL-1.1",
  "sspl-1.0": "SSPL-1.0",
  sspl: "SSPL-1.0",
  "server side public license": "SSPL-1.0",
  "elastic-2.0": "Elastic-2.0",
  "elastic license 2.0": "Elastic-2.0",
  elv2: "Elastic-2.0",
  proprietary: "Proprietary",
  commercial: "Proprietary",
  "closed source": "Proprietary",
  // npm uses "UNLICENSED" for packages that grant no rights; it is NOT the Unlicense.
  unlicensed: "Proprietary",
  unknown: "Unknown",
  noassertion: "Unknown",
  none: "Unknown",
  custom: "Custom",
  "see license in license": "Custom",
  "licenseref-custom": "Custom",
};

const GNU_PATTERNS: { pattern: RegExp; id: LicenseId }[] = [
  { pattern: /^(?:agpl|gnu affero general public license)[- ]?v?3(?:\.0)?/, id: "AGPL-3.0" },
  { pattern: /^(?:lgpl|gnu lesser general public license)[- ]?v?3(?:\.0)?/, id: "LGPL-3.0" },
  { pattern: /^(?:lgpl|gnu lesser general public license)[- ]?v?2\.1/, id: "LGPL-2.1" },
  { pattern: /^(?:gpl|gnu general public license)[- ]?v?3(?:\.0)?/, id: "GPL-3.0" },
  { pattern: /^(?:gpl|gnu general public license)[- ]?v?2(?:\.0)?/, id: "GPL-2.0" },
];

/** All licences in the knowledge base, including the Proprietary/Unknown/Custom pseudo-licences. */
export function getLicenses(): LicenseDefinition[] {
  return [...DEFINITIONS];
}

/** Resolve a licence string (SPDX id, alias or common name). Unrecognized input returns the Unknown definition. */
export function getLicense(input: string): LicenseDefinition {
  return getLicenseById(normalizeLicense(input).id);
}

export function getLicenseById(id: LicenseId): LicenseDefinition {
  const license = BY_ID.get(id);
  if (!license) throw new Error(`License definition missing for ${id}`);
  return license;
}

export function isKnownLicenseId(value: string): value is LicenseId {
  return BY_ID.has(value as LicenseId);
}

/**
 * Normalize user input. Never guesses: anything not matching an id, SPDX id or explicit alias is
 * returned as `Unknown` with `recognized: false`.
 */
export function normalizeLicense(rawInput: string): NormalizedLicense {
  const input = String(rawInput ?? "");
  const key = input.trim().replace(/\s+/g, " ").toLowerCase();
  const base = { input, recognized: true, orLater: false, versionOptionUnspecified: false };

  if (!key) return { ...base, id: "Unknown", recognized: false };

  const exact = DEFINITIONS.find(
    (license) => license.id.toLowerCase() === key || license.spdxId?.toLowerCase() === key,
  );
  if (exact && !GNU_IDS.includes(exact.id)) return { ...base, id: exact.id };

  const alias = ALIASES[key];
  if (alias) return { ...base, id: alias, recognized: alias !== "Unknown" };

  for (const { pattern, id } of GNU_PATTERNS) {
    const match = key.match(pattern);
    if (!match) continue;
    const rest = key.slice(match[0].length).trim();
    if (rest === "") return { ...base, id, versionOptionUnspecified: true };
    if (rest === "-only" || rest === "only") return { ...base, id };
    if (rest === "+" || rest === "-or-later" || rest === "or later" || rest === "or-later") {
      return { ...base, id, orLater: true };
    }
    // Anything else (e.g. GPL-2.0-with-classpath-exception) carries extra terms.
    return { ...base, id: "Custom" };
  }

  return { ...base, id: "Unknown", recognized: false };
}
