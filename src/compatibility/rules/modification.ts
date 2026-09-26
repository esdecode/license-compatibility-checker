import type { Rule, RuleFinding } from "../../types/index.js";
import { rulePrefix } from "../../utils/index.js";

/** APACHE_STATE_CHANGES, GPL_STATE_CHANGES, ELASTIC_LICENSE_KEY, ... */
export const modificationRule: Rule = (ctx) => {
  const { a } = ctx;
  if (a.category === "UNKNOWN" || a.category === "PROPRIETARY" || !ctx.modified) return null;
  const findings: RuleFinding[] = [];

  if (a.modification === "PERMITTED") {
    findings.push({
      ruleId: `${rulePrefix(a)}_MODIFICATION`,
      severity: "INFO",
      dimensions: ["modification"],
      message: `${a.id} permits modification.`,
    });
  }

  if (a.stateChangesRequired && ctx.distributed) {
    findings.push({
      ruleId: `${rulePrefix(a)}_STATE_CHANGES`,
      severity: "INFO",
      dimensions: ["modification"],
      message: `${a.id} requires modified files to carry notices stating that they were changed.`,
      obligations: [`Add a prominent change notice to each modified ${a.id} file you distribute.`],
    });
  }

  if (a.id === "Elastic-2.0") {
    findings.push({
      ruleId: "ELASTIC_LICENSE_KEY",
      severity: "INFO",
      dimensions: ["modification"],
      message:
        "Elastic-2.0 permits derivative works but prohibits moving, changing, disabling or circumventing licence key functionality.",
      obligations: ["Do not modify or bypass licence key functionality in Elastic-2.0 code."],
    });
  }

  return findings;
};
