import type { Rule, RuleFinding } from "../../types/index.js";
import { rulePrefix } from "../../utils/index.js";

/** <PREFIX>_DISTRIBUTION, RESALE_PERMITTED, WHITE_LABEL_TRADEMARK, ACQUISITION_TRANSFER. */
export const distributionRule: Rule = (ctx) => {
  const { a } = ctx;
  if (a.category === "UNKNOWN" || a.category === "PROPRIETARY") return null;
  const findings: RuleFinding[] = [];

  if (ctx.distributed && a.distribution === "PERMITTED") {
    findings.push({
      ruleId: `${rulePrefix(a)}_DISTRIBUTION`,
      severity: "INFO",
      dimensions: ["distribution"],
      message: `${a.id} permits distribution${a.copyleft === "NONE" ? "" : " subject to its copyleft conditions"}.`,
    });
  }

  if ((ctx.scenario === "RESELL" || ctx.scenario === "SOURCE_CODE_ACQUISITION") && a.category !== "SOURCE_AVAILABLE") {
    findings.push({
      ruleId: "RESALE_PERMITTED",
      severity: "INFO",
      dimensions: ["distribution", "commercialUse"],
      message: `${a.id} does not prohibit charging for copies. Each recipient receives the ${a.id}-licensed code under ${a.id}, not under your own terms${a.copyleft !== "NONE" ? ", including the right to redistribute it" : ""}.`,
    });
  }

  if (ctx.scenario === "WHITE_LABEL" && a.trademarkUse === "PROHIBITED") {
    findings.push({
      ruleId: "WHITE_LABEL_TRADEMARK",
      severity: "INFO",
      dimensions: ["distribution"],
      message: `${a.id} grants no trademark rights. Rebranding is fine, but do not use the original project's names or logos for your product without permission.`,
    });
  }

  return findings;
};
