import type { LicenseId, RuleContext, RuleFinding } from "../../types/index.js";
import { SOURCES } from "../../licenses/sources/index.js";

/**
 * Pair-specific compatibility facts that cannot be derived from generic licence properties.
 * Each exception evaluates "component A used in project B" and returns null when it does not apply.
 * Sources: FSF licence list / GPL FAQ, Apache GPL-compatibility page, MPL-2.0 section 3.3, EPL-2.0 FAQ.
 */
export type PairException = (ctx: RuleContext) => RuleFinding[] | null;

const GPL3_FAMILY: readonly LicenseId[] = ["GPL-3.0", "LGPL-3.0", "AGPL-3.0"];
const GNU_TARGETS: readonly LicenseId[] = ["GPL-2.0", "GPL-3.0", "LGPL-2.1", "LGPL-3.0", "AGPL-3.0"];

/** Project licence is GPL-2.0-only (not "or later"). */
const isGpl2Only = (ctx: RuleContext, side: "a" | "b") =>
  ctx[side].id === "GPL-2.0" && !(side === "a" ? ctx.aNormalized : ctx.bNormalized).orLater;

const distributedOnly = (ctx: RuleContext, finding: RuleFinding): RuleFinding => {
  if (ctx.distributed) return finding;
  return {
    ...finding,
    severity: "INFO",
    message: `${finding.message} This only becomes relevant when the combined work is distributed, which this scenario does not include.`,
  };
};

const apacheIntoGnu: PairException = (ctx) => {
  if (ctx.a.id !== "Apache-2.0" || !GNU_TARGETS.includes(ctx.b.id)) return null;
  if (isGpl2Only(ctx, "b")) {
    return [
      distributedOnly(ctx, {
        ruleId: "APACHE_GPL2_INCOMPATIBLE",
        severity: "CONFLICT",
        dimensions: ["copyleft", "patents", "distribution"],
        message:
          "The FSF and the Apache Software Foundation consider Apache-2.0 incompatible with GPL-2.0-only, because Apache-2.0's patent termination and indemnification terms are additional restrictions GPL-2.0 does not allow.",
        risks: [
          "Distributing a GPL-2.0-only work that incorporates Apache-2.0 code is generally considered a licence violation.",
        ],
        recommendations: [
          'Check whether the GPL-2.0 project is actually licensed "GPL-2.0-or-later"; if so the combination can be distributed under GPL-3.0.',
          "Otherwise, replace the Apache-2.0 component or keep it as a separate program.",
        ],
        sources: [SOURCES.apacheGplCompatibility, SOURCES.fsfLicenseList],
      }),
    ];
  }
  if (ctx.b.id === "LGPL-2.1" && !ctx.bNormalized.orLater) {
    return [
      distributedOnly(ctx, {
        ruleId: "APACHE_LGPL21_REVIEW",
        severity: "WARNING",
        dimensions: ["copyleft", "patents"],
        message:
          "Apache-2.0 is considered GPL-3.0-compatible but not GPL-2.0-compatible. Combining Apache-2.0 code into an LGPL-2.1 library may raise the same patent-clause concerns unless the combination can be offered under version 3 terms.",
        recommendations: ["Review whether the LGPL-2.1 library may be used under LGPL-3.0 / GPL-3.0 terms."],
        sources: [SOURCES.apacheGplCompatibility, SOURCES.fsfLicenseList],
        confidence: "MEDIUM",
      }),
    ];
  }
  const orLater = ctx.b.id === "GPL-2.0" || ctx.b.id === "LGPL-2.1";
  return [
    distributedOnly(ctx, {
      ruleId: "APACHE_GPL3_COMPATIBLE",
      severity: "CONDITION",
      dimensions: ["copyleft", "distribution", "sourceDisclosure"],
      message: `Apache-2.0 code can be included in ${orLater ? `a project under ${ctx.b.id}-or-later when the combination is distributed under GPL-3.0 terms` : `a project under ${ctx.b.id}`}; the combined work is distributed under the GNU licence while the Apache-2.0 notices are retained. This is one-directional: ${ctx.b.id} code cannot be relicensed under Apache-2.0.`,
      obligations: [
        orLater
          ? 'Distribute the combined work under GPL-3.0 (using the project\'s "or later" option).'
          : `Distribute the combined work under ${ctx.b.id}.`,
        "Retain Apache-2.0 notices and any NOTICE file content.",
      ],
      sources: [SOURCES.apacheGplCompatibility, SOURCES.fsfLicenseList],
    }),
  ];
};

/** GPL-2.0-only code into an Apache-2.0 project: the combined work would need GPL-2.0, which cannot carry Apache-2.0 code. */
const gpl2IntoApache: PairException = (ctx) => {
  if (ctx.b.id !== "Apache-2.0" || !isGpl2Only(ctx, "a") || ctx.integration === "SEPARATE_PROGRAM") return null;
  if (!ctx.distributed) return null;
  return [
    {
      ruleId: "APACHE_GPL2_INCOMPATIBLE",
      severity: "CONFLICT",
      dimensions: ["copyleft", "patents", "distribution"],
      message:
        "A distributed work containing GPL-2.0-only code must be licensed as a whole under GPL-2.0, and the FSF and the Apache Software Foundation consider Apache-2.0 code incompatible with GPL-2.0. The Apache-2.0 project code and the GPL-2.0-only code therefore generally cannot be combined into one distributed work.",
      recommendations: [
        'Check whether the component is actually "GPL-2.0-or-later"; if so the combination could be distributed under GPL-3.0.',
      ],
      sources: [SOURCES.apacheGplCompatibility, SOURCES.fsfLicenseList],
    },
  ];
};

const gnuVersionMismatch: PairException = (ctx) => {
  const { a, b } = ctx;
  if (!GNU_TARGETS.includes(a.id) || !GNU_TARGETS.includes(b.id) || a.id === b.id) return null;

  // GPL-2.0-only component into a v3-family project.
  if (isGpl2Only(ctx, "a") && GPL3_FAMILY.includes(b.id)) {
    return [
      distributedOnly(ctx, {
        ruleId: "GPL2_ONLY_V3_INCOMPATIBLE",
        severity: "CONFLICT",
        dimensions: ["copyleft", "distribution"],
        message: `GPL-2.0-only code cannot be combined into a work under ${b.id}: GPL-2.0-only requires the whole work under GPL-2.0, while ${b.id} requires version 3 terms.`,
        recommendations: [
          'Check whether the GPL-2.0 component is actually "GPL-2.0-or-later"; if so the combination can use GPL-3.0.',
        ],
        sources: [SOURCES.gplFaqV2V3, SOURCES.gplCompatibilityMatrix],
      }),
    ];
  }

  // GPL-2.0-or-later component into a v3-family project.
  if (a.id === "GPL-2.0" && ctx.aNormalized.orLater && GPL3_FAMILY.includes(b.id)) {
    return [
      distributedOnly(ctx, {
        ruleId: "GPL2_OR_LATER_UPGRADE",
        severity: "CONDITION",
        dimensions: ["copyleft", "distribution", "sourceDisclosure"],
        message: `GPL-2.0-or-later code may be used under GPL-3.0, so it can be combined into a work under ${b.id} distributed under version 3 terms.`,
        obligations: [
          "Distribute the combined work under GPL-3.0-compatible version 3 terms with Corresponding Source.",
        ],
        sources: [SOURCES.gplFaqV2V3, SOURCES.gplCompatibilityMatrix],
      }),
    ];
  }

  // v3-family component into a GPL-2.0 or LGPL-2.1 project.
  if (GPL3_FAMILY.includes(a.id) && (b.id === "GPL-2.0" || b.id === "LGPL-2.1")) {
    const bOrLater = ctx.bNormalized.orLater;
    return [
      distributedOnly(ctx, {
        ruleId: bOrLater ? "GPL_V3_INTO_V2_OR_LATER" : "GPL_V3_INTO_V2_ONLY_INCOMPATIBLE",
        severity: bOrLater ? "WARNING" : "CONFLICT",
        dimensions: ["copyleft", "distribution"],
        message: bOrLater
          ? `${a.id} code can only be combined with a project under ${b.id}-or-later if the combined work is distributed under version 3 terms; the project could then no longer be distributed under ${b.id} alone.`
          : `${a.id} code cannot be combined into a ${b.id}-only work: the version 2 and version 3 licences each require the combined work under their own terms.`,
        sources: [SOURCES.gplFaqV2V3, SOURCES.gplCompatibilityMatrix],
      }),
    ];
  }

  // GPL-3.0 <-> AGPL-3.0: permitted by section 13 of both licences.
  if ((a.id === "GPL-3.0" && b.id === "AGPL-3.0") || (a.id === "AGPL-3.0" && b.id === "GPL-3.0")) {
    const agplComponent = a.id === "AGPL-3.0";
    return [
      {
        ruleId: "GPL3_AGPL3_SECTION13",
        severity: agplComponent ? "WARNING" : "CONDITION",
        dimensions: ["copyleft", "networkUse", "sourceDisclosure"],
        message: agplComponent
          ? "Section 13 of GPL-3.0 allows combining with AGPL-3.0 code, but the AGPL-3.0 part keeps its network-use requirement: users interacting with a modified version over a network must be offered its source. The combined work cannot be treated as plain GPL-3.0."
          : "Section 13 of AGPL-3.0 and GPL-3.0 allows GPL-3.0 code to be combined into an AGPL-3.0 work. The GPL-3.0 part stays under GPL-3.0; the combination as a whole is subject to AGPL-3.0 section 13.",
        obligations: ["Provide Corresponding Source when conveying the combined work."],
        sources: [SOURCES.gplFaq],
      },
    ];
  }

  // LGPL component into a GPL/AGPL project: LGPL permits using the code under GPL terms.
  if ((a.id === "LGPL-2.1" || a.id === "LGPL-3.0") && ["GPL-2.0", "GPL-3.0", "AGPL-3.0"].includes(b.id)) {
    return [
      {
        ruleId: "LGPL_INTO_GPL",
        severity: "CONDITION",
        dimensions: ["copyleft", "sourceDisclosure"],
        message: `${a.id} permits its code to be used under the terms of the GPL, so it can be combined into a work distributed under ${b.id}.`,
        obligations: ["Provide Corresponding Source for the combined work when distributing."],
        sources: [SOURCES.gplCompatibilityMatrix, SOURCES.fsfLicenseList],
      },
    ];
  }

  return null;
};

const mplIntoGnu: PairException = (ctx) => {
  if (ctx.a.id !== "MPL-2.0" || !GNU_TARGETS.includes(ctx.b.id)) return null;
  return [
    distributedOnly(ctx, {
      ruleId: "MPL_SECONDARY_LICENSE",
      severity: "CONDITION",
      dimensions: ["copyleft", "sourceDisclosure"],
      message: `MPL-2.0 section 3.3 lets MPL-2.0 files be distributed as part of a Larger Work under GPL-2.0, LGPL-2.1, AGPL-3.0 or later versions ("Secondary Licenses"), so combining into a project under ${ctx.b.id} is generally possible. The MPL-2.0 files must still be available under MPL-2.0. This does not apply if the files carry an "Incompatible With Secondary Licenses" notice.`,
      obligations: ["Keep MPL-2.0 files available under MPL-2.0 as well as the GNU licence."],
      risks: [
        'If the MPL-2.0 files are marked "Incompatible With Secondary Licenses", the combination is not permitted.',
      ],
      recommendations: ['Check the MPL-2.0 file headers for an "Incompatible With Secondary Licenses" notice.'],
      sources: [SOURCES.mplFaq, SOURCES.fsfLicenseList],
      confidence: "MEDIUM",
    }),
  ];
};

const eplIntoGnu: PairException = (ctx) => {
  if (ctx.a.id !== "EPL-2.0" || !GNU_TARGETS.includes(ctx.b.id)) return null;
  return [
    distributedOnly(ctx, {
      ruleId: "EPL2_SECONDARY_LICENSE",
      severity: "REVIEW",
      dimensions: ["copyleft"],
      message:
        "EPL-2.0 is not GPL-compatible by default. It can be combined with GPL-2.0-or-later code only if the initial contributor designated a Secondary License in the EPL-2.0 Exhibit A notice.",
      recommendations: ["Check the component's EPL-2.0 notice for a Secondary License designation."],
      sources: [SOURCES.eplFaq, SOURCES.fsfLicenseList],
      confidence: "LOW",
    }),
  ];
};

const cddlIntoGnu: PairException = (ctx) => {
  if (ctx.a.id !== "CDDL-1.0" || !GNU_TARGETS.includes(ctx.b.id)) return null;
  return [
    distributedOnly(ctx, {
      ruleId: "CDDL_GPL_INCOMPATIBLE",
      severity: "CONFLICT",
      dimensions: ["copyleft", "distribution"],
      message: `The FSF lists CDDL-1.0 as incompatible with the GNU GPL: a module under CDDL-1.0 and a module under ${ctx.b.id} cannot legally be linked into one distributed program.`,
      sources: [SOURCES.fsfLicenseList],
    }),
  ];
};

export const PAIR_EXCEPTIONS: readonly PairException[] = [
  apacheIntoGnu,
  gpl2IntoApache,
  gnuVersionMismatch,
  mplIntoGnu,
  eplIntoGnu,
  cddlIntoGnu,
];

export function findPairException(ctx: RuleContext): RuleFinding[] | null {
  for (const exception of PAIR_EXCEPTIONS) {
    const findings = exception(ctx);
    if (findings) return findings;
  }
  return null;
}
