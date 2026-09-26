# @esdecode/license-checker

Deterministic, **directional** software license compatibility engine for TypeScript and Node.js, with a multi-license project analyzer and a source-code acquisition analyzer.

- 21 licences (SPDX identifiers), each with structured facts and authoritative source links
- Rule-based: no AI, no giant hard-coded matrix, every triggered rule has an ID
- Directional: _using A-licensed code in a B project_ is not the same question as the reverse
- Honest uncertainty: unknown licences stay `UNKNOWN`, ambiguous terms become `MANUAL_REVIEW_REQUIRED`
- Zero runtime dependencies, ESM, fully typed, framework-independent

**Live web interface:** https://esdecode.com/tools/license-compatibility-checker

Built by [ESDecode](https://esdecode.com).

> This library provides general software licensing information and is not legal advice. License obligations can depend on how software is combined, modified, distributed and used. High-risk or ambiguous cases should be reviewed against the actual license text and, where appropriate, by qualified legal counsel.

## Installation

```bash
npm install @esdecode/license-checker
```

Requires Node.js 18+. The package is ESM-only.

## Quick start

```ts
import { checkCompatibility } from "@esdecode/license-checker";

const result = checkCompatibility({
  licenseA: "GPL-3.0", // licence of the component you want to use
  licenseB: "Proprietary", // licence of your project
  scenario: "PROPRIETARY_SOFTWARE",
});

result.status; // "LIKELY_INCOMPATIBLE"
result.direction; // "Using GPL-3.0-licensed code in a proprietary project"
result.diagnostics.triggeredRules.map((r) => r.ruleId); // includes "GPL_STRONG_COPYLEFT_DISTRIBUTION"
```

The same GPL-3.0 code used only on your own servers:

```ts
checkCompatibility({ licenseA: "GPL-3.0", licenseB: "Proprietary", scenario: "SAAS" }).status;
// "COMPATIBLE_WITH_CONDITIONS" (GPL-3.0 has no network clause; do not distribute the code)

checkCompatibility({ licenseA: "AGPL-3.0", licenseB: "Proprietary", scenario: "SAAS", modified: true }).status;
// "LIKELY_INCOMPATIBLE" (AGPL-3.0 section 13)
```

Direction matters:

```ts
checkCompatibility({ licenseA: "Apache-2.0", licenseB: "GPL-3.0", scenario: "DISTRIBUTE_BINARY" }).status;
// "COMPATIBLE_WITH_CONDITIONS"
checkCompatibility({ licenseA: "GPL-3.0", licenseB: "Apache-2.0", scenario: "DISTRIBUTE_BINARY" }).status;
// "POTENTIAL_CONFLICT" (the combined work would have to be GPL-3.0)
```

## API

```ts
import {
  checkCompatibility,
  analyzeProject,
  analyzeSourceCodeAcquisition,
  getLicense,
  getLicenses,
  normalizeLicense,
  parseManifest,
  resolveLicenseExpression,
} from "@esdecode/license-checker";
```

### `checkCompatibility(input): CompatibilityResult`

| Field                     | Type                                                                                           | Notes                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `licenseA`                | `string`                                                                                       | Component licence (inbound). SPDX id, alias or common name.  |
| `licenseB`                | `string`                                                                                       | Project licence (outbound). `"Proprietary"` for closed code. |
| `scenario`                | `Scenario`                                                                                     | See below.                                                   |
| `distributed`             | `boolean?`                                                                                     | Overrides the scenario default.                              |
| `networkUse`              | `boolean?`                                                                                     | Users interact with it over a network.                       |
| `modified`                | `boolean?`                                                                                     | The component itself is modified.                            |
| `finalProjectProprietary` | `boolean?`                                                                                     | The result is offered under closed terms.                    |
| `commercial`              | `boolean?`                                                                                     | Commercial use. Never implies proprietary use.               |
| `integration`             | `"DYNAMIC_LINK" \| "STATIC_LINK" \| "SOURCE_INCLUSION" \| "SEPARATE_PROGRAM" \| "UNSPECIFIED"` | Matters for LGPL, MPL and GPL.                               |

Scenarios: `DEPENDENCY`, `INCLUDE_SOURCE`, `MODIFY`, `DISTRIBUTE_BINARY`, `DISTRIBUTE_SOURCE`, `COMMERCIAL_SOFTWARE`, `PROPRIETARY_SOFTWARE`, `SAAS`, `INTERNAL_USE`, `RESELL`, `WHITE_LABEL`, `SOURCE_CODE_ACQUISITION`. `SCENARIO_DEFAULTS` and `SCENARIO_LABELS` expose the defaults and human labels. When a scenario does not determine a fact, the default is the one that **surfaces** obligations (for example `distributed: true`).

Result (presentation-independent, no HTML):

```ts
{
  status: "GENERALLY_COMPATIBLE" | "COMPATIBLE_WITH_CONDITIONS" | "POTENTIAL_CONFLICT"
        | "LIKELY_INCOMPATIBLE" | "MANUAL_REVIEW_REQUIRED" | "UNKNOWN";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  direction: string;
  shortSummary: string;
  explanation: string[];       // most severe first
  obligations: string[];
  risks: string[];
  recommendations: string[];
  sources: LicenseSource[];    // SPDX, OSI, FSF, official texts
  dimensions: Record<
    "commercialUse" | "modification" | "distribution" | "sourceDisclosure" | "attribution"
    | "patents" | "copyleft" | "networkUse" | "proprietaryUse",
    { status: "OK" | "OBLIGATIONS" | "CONDITIONS" | "WARNING" | "CONFLICT" | "REVIEW" | "UNKNOWN"; summary: string; ruleIds: string[] }
  >;
  diagnostics: { triggeredRules: { ruleId: string; severity: Severity }[]; normalized: { a; b } };
  licenseA; licenseB; context; disclaimer;
}
```

### `analyzeProject(input): ProjectAnalysis`

```ts
import { analyzeProject } from "@esdecode/license-checker";

const analysis = analyzeProject({
  licenses: ["MIT", "Apache-2.0", "BSD-3-Clause", "GPL-3.0", "PROPRIETARY"],
});

analysis.overallRisk; // "HIGH"
analysis.effectiveProjectLicense; // "Proprietary"
analysis.sections.copyleftRisk; // { level: "HIGH", licenses: ["GPL-3.0"], ruleIds: ["GPL_STRONG_COPYLEFT_DISTRIBUTION", ...], ... }
analysis.warnings; // which licences caused which rules
```

Sections: `copyleftRisk`, `networkCopyleft`, `sourceDisclosure`, `patentClauses`, `attributionRequirements`, `proprietaryCompatibility`, `commercialUse`, `distributionRisk`, `unknownLicenses`. Each has a `level` (`NONE | LOW | MEDIUM | HIGH | UNKNOWN`), the responsible licences and rule IDs. `overallRisk` is `LOW | MEDIUM | HIGH | MANUAL_REVIEW`.

Each component is checked against an **effective project licence**: `projectLicense` if given; otherwise `Proprietary` when proprietary code is present or `context.finalProjectProprietary` is set; otherwise the strongest copyleft licence present. A `"Proprietary"` entry in a proprietary project is treated as your own code.

### `analyzeSourceCodeAcquisition(input): AcquisitionReport`

```ts
import { analyzeSourceCodeAcquisition } from "@esdecode/license-checker";

const report = analyzeSourceCodeAcquisition({
  mainProjectLicense: "Proprietary",
  thirdPartyLicenses: ["MIT", "GPL-3.0"],
  commercialUse: true,
  saas: false,
  redistribution: true,
  modification: true,
  whiteLabel: false,
  resale: false,
});

report.overallRisk; // "HIGH"
report.sections.copyleftRisk.level; // "HIGH"
report.sellerQuestions.map((q) => q.topic); // COPYRIGHT_OWNERSHIP, FONTS, ICONS, DATASETS, ...
```

Sections: `commercialUse`, `ownershipRisk`, `copyleftRisk`, `thirdPartyComponents`, `redistribution`, `saasNetworkUse`, `whiteLabelResale`, `unknownComponents`. The analyzer **does not verify copyright ownership**; it identifies licensing risks and the questions to ask the seller.

### Licences

```ts
getLicense("GPL-3.0-or-later"); // LicenseDefinition for GPL-3.0
getLicenses(); // all 21 definitions
normalizeLicense("GPL-2.0+"); // { id: "GPL-2.0", orLater: true, recognized: true, ... }
normalizeLicense("UNLICENSED"); // { id: "Proprietary" } (npm's "no rights granted", not the Unlicense)
normalizeLicense("WTFPL"); // { id: "Unknown", recognized: false }
```

### Dependency manifests

```ts
import { parseManifest, declaredLicenseResolver } from "@esdecode/license-checker";

const manifest = parseManifest("package-lock.json", fileContents);
for (const dependency of manifest.dependencies) {
  declaredLicenseResolver.resolve(dependency); // { status: "RESOLVED", licenseIds, operator } | { status: "UNKNOWN", reason }
}
```

| File                | Status    | Licence data                                 |
| ------------------- | --------- | -------------------------------------------- |
| `package-lock.json` | v2/v3     | Declared licence of each installed package   |
| `composer.lock`     | supported | Declared licence array (OR)                  |
| `package.json`      | supported | Project licence only; dependencies `UNKNOWN` |
| `composer.json`     | supported | Project licence only; dependencies `UNKNOWN` |
| `yarn.lock`         | v1 only   | None; dependencies `UNKNOWN`                 |
| `pnpm-lock.yaml`    | not yet   | Throws `UnsupportedManifestError`            |

Licences are **never guessed** from package names. `DependencyResolver` and `LicenseResolver` interfaces are provided for registry-backed resolution, which is intentionally not part of this package.

## Supported licences

| ID           | Category                 | Copyleft   |
| ------------ | ------------------------ | ---------- |
| MIT          | Open source              | None       |
| Apache-2.0   | Open source              | None       |
| BSD-2-Clause | Open source              | None       |
| BSD-3-Clause | Open source              | None       |
| ISC          | Open source              | None       |
| MPL-2.0      | Open source              | File-level |
| LGPL-2.1     | Open source              | Weak       |
| LGPL-3.0     | Open source              | Weak       |
| GPL-2.0      | Open source              | Strong     |
| GPL-3.0      | Open source              | Strong     |
| AGPL-3.0     | Open source              | Network    |
| EPL-2.0      | Open source              | Weak       |
| CDDL-1.0     | Open source              | File-level |
| Unlicense    | Public-domain equivalent | None       |
| CC0-1.0      | Public-domain equivalent | None       |
| BUSL-1.1     | Source-available         | None       |
| SSPL-1.0     | Source-available         | Network    |
| Elastic-2.0  | Source-available         | None       |
| Proprietary  | Proprietary              | n/a        |
| Unknown      | Unknown                  | n/a        |
| Custom       | Unknown                  | n/a        |

GNU licences accept `-only`, `-or-later` and `+`. A bare `GPL-2.0` is treated as `GPL-2.0-only` and flagged. `BSL-1.1` is accepted as an alias of SPDX `BUSL-1.1` (`BSL-1.0` is the Boost licence and is not in the knowledge base). A GNU licence with an exception (e.g. `WITH Classpath-exception-2.0`) is treated as `Custom`.

## Architecture

```
src/
  licenses/        factual licence metadata (definitions/) and source references (sources/)
  compatibility/
    rules/         one file per concern; each rule is a pure function (ctx) => findings
    exceptions/    pair-specific facts (Apache/GPL-2.0, GPL v2/v3, MPL secondary licences, CDDL, EPL)
    scoring.ts     severity -> status and confidence
    engine.ts      context resolution, rule execution, result assembly
  project/         multi-licence analyzer and risk sections
  acquisition/     source-code acquisition analyzer and seller questions
  packages/        manifest parsers, SPDX expression parser, declared-licence resolver
  types/           public types
```

Each rule returns findings with a `severity`: `INFO` (no status effect; may carry obligations), `CONDITION`, `WARNING`, `REVIEW`, `CONFLICT`, `UNKNOWN`. The overall status is derived from the most severe finding, with `UNKNOWN` outranking everything and a known conflict outranking the need for review.

### Rule IDs

| Area              | Rule IDs                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unknown           | `UNKNOWN_LICENSE`, `CUSTOM_LICENSE_REVIEW`, `GNU_VERSION_OPTION_UNSPECIFIED`                                                                                                                                                                                                                                                                                                                                                      |
| Copyleft          | `<P>_STRONG_COPYLEFT_DISTRIBUTION`, `<P>_NOT_DISTRIBUTED`, `<P>_SAME_LICENSE`, `<P>_SEPARATE_PROGRAM`, `<P>_INCOMPATIBLE_PROJECT_LICENSE`, `COPYLEFT_RELICENSE_REQUIRED`, `LGPL_LIBRARY_LINKING`, `LGPL_STATIC_LINKING`, `LGPL_SOURCE_INCLUSION`, `LGPL_MODIFIED_LIBRARY`, `MPL_FILE_LEVEL_COPYLEFT`, `CDDL_FILE_LEVEL_COPYLEFT`, `EPL_WEAK_COPYLEFT`, `PERMISSIVE_INTO_COPYLEFT`, `COMPONENT_INCOMPATIBLE_WITH_PROJECT_COPYLEFT` |
| Pair exceptions   | `APACHE_GPL2_INCOMPATIBLE`, `APACHE_LGPL21_REVIEW`, `APACHE_GPL3_COMPATIBLE`, `GPL2_ONLY_V3_INCOMPATIBLE`, `GPL2_OR_LATER_UPGRADE`, `GPL_V3_INTO_V2_ONLY_INCOMPATIBLE`, `GPL_V3_INTO_V2_OR_LATER`, `GPL3_AGPL3_SECTION13`, `LGPL_INTO_GPL`, `MPL_SECONDARY_LICENSE`, `EPL2_SECONDARY_LICENSE`, `CDDL_GPL_INCOMPATIBLE`                                                                                                            |
| Network use       | `AGPL_NETWORK_USE`, `SSPL_SERVICE_SOURCE`, `ELASTIC_MANAGED_SERVICE`, `GPL_SAAS_NO_DISTRIBUTION`                                                                                                                                                                                                                                                                                                                                  |
| Proprietary / SA  | `PROPRIETARY_COMPONENT_TERMS`, `PROPRIETARY_INTO_COPYLEFT`, `PERMISSIVE_PROPRIETARY_USE`, `SOURCE_AVAILABLE_COMPONENT`, `SOURCE_AVAILABLE_INTO_OPEN_SOURCE`, `SSPL_COPYLEFT_DISTRIBUTION`, `BUSL_ADDITIONAL_USE_GRANT`                                                                                                                                                                                                            |
| Commercial use    | `<P>_COMMERCIAL_USE`, `<P>_COMMERCIAL_RESTRICTIONS`                                                                                                                                                                                                                                                                                                                                                                               |
| Attribution       | `<P>_ATTRIBUTION` (e.g. `MIT_ATTRIBUTION`), `APACHE_NOTICE_FILE`, `BSD_NO_ENDORSEMENT`, `WHITE_LABEL_NOTICES`, `PUBLIC_DOMAIN_NO_ATTRIBUTION`                                                                                                                                                                                                                                                                                     |
| Modification      | `<P>_MODIFICATION`, `<P>_STATE_CHANGES`, `ELASTIC_LICENSE_KEY`                                                                                                                                                                                                                                                                                                                                                                    |
| Distribution      | `<P>_DISTRIBUTION`, `RESALE_PERMITTED`, `WHITE_LABEL_TRADEMARK`                                                                                                                                                                                                                                                                                                                                                                   |
| Source disclosure | `<P>_SOURCE_DISCLOSURE`, `NO_SOURCE_DISCLOSURE`                                                                                                                                                                                                                                                                                                                                                                                   |
| Patents           | `<P>_PATENT_NOTICE` (e.g. `APACHE_PATENT_NOTICE`), `PATENT_NO_EXPRESS_GRANT`, `CC0_PATENT_EXCLUSION`                                                                                                                                                                                                                                                                                                                              |

`<P>` is the licence prefix: `MIT`, `APACHE`, `BSD`, `ISC`, `MPL`, `LGPL`, `GPL`, `AGPL`, `EPL`, `CDDL`, `UNLICENSE`, `CC0`, `BUSL`, `SSPL`, `ELASTIC`.

## Adding a licence

1. Add the id to `LICENSE_IDS` in `src/types/license.ts`.
2. Add a `LicenseDefinition` in `src/licenses/definitions/` with facts taken from the official text, SPDX, OSI, FSF or the vendor. Every definition needs `sources`.
3. Register it in `src/licenses/index.ts` and add aliases only when they are unambiguous.
4. Add pair exceptions if an authoritative source documents a specific compatibility result.
5. Add tests. The matrix test automatically covers the new licence against every other licence and scenario.

## Adding a rule

1. Create or extend a file in `src/compatibility/rules/`. A rule is `(ctx: RuleContext) => RuleFinding | RuleFinding[] | null`.
2. Give each finding a stable upper-snake-case `ruleId`, the affected `dimensions`, a concise message, and `sources` where the conclusion depends on an interpretation.
3. Use wording like "generally", "may require", "if the software is distributed". Never "guaranteed" or "definitely safe".
4. Register the rule in `RULES` (`src/compatibility/rules/index.ts`) and add a focused test in `tests/compatibility/rules.test.ts`.

## Testing

```bash
npm test           # vitest
npm run typecheck
npm run lint
npm run build
npm run verify:exports
```

The suite includes a full licence x licence x scenario matrix that checks result shape, source URLs, forbidden overconfident wording and that `UNKNOWN` stays `UNKNOWN`.

## Limitations

- The engine reasons about licence **terms**, not facts it cannot see: how code is linked, whether a file header carries extra permissions, or what a proprietary agreement says.
- Pair-specific results follow published positions of the FSF, ASF, Mozilla and Eclipse Foundations. Courts in different jurisdictions may reach different conclusions.
- Licence exceptions (`WITH ...`), dual-licensing choices and `LicenseRef-*` licences are reported as `Custom` rather than evaluated.
- BUSL-1.1 parameters (Additional Use Grant, Change Date) vary per product and always require review.
- Dependency resolution from registries is not included; lockfiles without licence data yield `UNKNOWN`.
- Content licences (Creative Commons BY/SA/NC etc. for images, fonts, datasets) are out of scope, apart from CC0-1.0.

## Legal disclaimer

This library provides general software licensing information and is not legal advice. License obligations can depend on how software is combined, modified, distributed and used. High-risk or ambiguous cases should be reviewed against the actual license text and, where appropriate, by qualified legal counsel.

## License

[MIT](./LICENSE) © ESDecode
