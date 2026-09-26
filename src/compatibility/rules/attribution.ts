import type { Rule, RuleFinding } from "../../types/index.js";
import { rulePrefix } from "../../utils/index.js";

/** MIT_ATTRIBUTION, APACHE_ATTRIBUTION, APACHE_NOTICE_FILE, BSD_NO_ENDORSEMENT, WHITE_LABEL_NOTICES, ... */
export const attributionRule: Rule = (ctx) => {
  const { a } = ctx;
  if (a.category === "UNKNOWN" || a.category === "PROPRIETARY") return null;
  const findings: RuleFinding[] = [];
  const prefix = rulePrefix(a);

  if (a.attributionRequired === false) {
    findings.push({
      ruleId: "PUBLIC_DOMAIN_NO_ATTRIBUTION",
      severity: "INFO",
      dimensions: ["attribution"],
      message: `${a.id} does not require attribution. Keeping a credit is still good practice for provenance.`,
    });
    return findings;
  }

  if (!ctx.distributed) {
    findings.push({
      ruleId: `${prefix}_ATTRIBUTION`,
      severity: "INFO",
      dimensions: ["attribution"],
      message: `${a.id} notice requirements generally apply when the software is distributed. For this non-distributed scenario they are not triggered, but keep the notices in the source in case it is distributed later.`,
    });
    return findings;
  }

  findings.push({
    ruleId: `${prefix}_ATTRIBUTION`,
    severity: "INFO",
    dimensions: ["attribution"],
    message: `${a.id} requires the copyright and licence notices to be kept with copies you distribute.`,
    obligations: [
      `Include the ${a.id} copyright notice and licence text with the distributed software (source, binary documentation or an "open-source notices" screen).`,
    ],
  });

  if (a.id === "Apache-2.0") {
    findings.push({
      ruleId: "APACHE_NOTICE_FILE",
      severity: "INFO",
      dimensions: ["attribution"],
      message:
        "If the Apache-2.0 component ships a NOTICE file, its attribution notices must be reproduced in your distribution (section 4(d)).",
      obligations: ["Reproduce the contents of any Apache-2.0 NOTICE file in your distribution's notices."],
    });
  }

  if (a.id === "BSD-3-Clause") {
    findings.push({
      ruleId: "BSD_NO_ENDORSEMENT",
      severity: "INFO",
      dimensions: ["attribution"],
      message:
        "BSD-3-Clause prohibits using the copyright holder's or contributors' names to endorse or promote your product without permission.",
      obligations: ["Do not use the component authors' names to promote your product without written permission."],
    });
  }

  if (ctx.scenario === "WHITE_LABEL" || ctx.scenario === "RESELL") {
    findings.push({
      ruleId: "WHITE_LABEL_NOTICES",
      severity: "INFO",
      dimensions: ["attribution"],
      message: `Rebranding or reselling does not remove the ${a.id} notice requirements. Notices may usually be placed in an "about", "legal" or "third-party notices" section rather than in the main branding.`,
      obligations: [`Keep ${a.id} notices in the white-labelled or resold product.`],
    });
  }

  return findings;
};
