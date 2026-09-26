import type { Rule } from "../../types/index.js";
import { rulePrefix } from "../../utils/index.js";

/**
 * Commercial use is about charging money or using software in a business. It is never treated as
 * equivalent to proprietary use and never on its own as a conflict.
 */
export const commercialUseRule: Rule = (ctx) => {
  const { a } = ctx;
  if (a.category === "UNKNOWN") return null;

  if (a.id === "BUSL-1.1") {
    return {
      ruleId: "BUSL_ADDITIONAL_USE_GRANT",
      severity: "REVIEW",
      dimensions: ["commercialUse", "proprietaryUse"],
      message:
        "BUSL-1.1 permits non-production use; production use is only permitted as far as the licensor's Additional Use Grant allows. The grant, Change Date and Change License differ per product.",
      obligations: ["Stay within the Additional Use Grant for any production use, or obtain a commercial licence."],
      recommendations: ["Read the Additional Use Grant and Change Date in the product's LICENSE file."],
      confidence: "LOW",
    };
  }

  if (a.category === "PROPRIETARY") return null; // handled by proprietary rules

  if (a.commercialUse === "PERMITTED") {
    const copyleftNote =
      a.copyleft !== "NONE"
        ? " Commercial use, including selling copies, is allowed; the copyleft conditions still apply to how the code is distributed."
        : "";
    return {
      ruleId: `${rulePrefix(a)}_COMMERCIAL_USE`,
      severity: "INFO",
      dimensions: ["commercialUse"],
      message: `${a.id} permits commercial use.${copyleftNote}`,
    };
  }

  if (a.commercialUse === "CONDITIONAL") {
    return {
      ruleId: `${rulePrefix(a)}_COMMERCIAL_RESTRICTIONS`,
      severity: ctx.commercial || ctx.scenario === "SAAS" ? "WARNING" : "INFO",
      dimensions: ["commercialUse"],
      message: `${a.id} is source-available: commercial use is permitted only within its restrictions (${a.restrictions.join("; ")}).`,
      risks: [...a.restrictions],
      recommendations: [
        `Confirm your commercial use falls outside the ${a.id} restrictions, or obtain a commercial licence.`,
      ],
      confidence: "MEDIUM",
    };
  }

  return null;
};
