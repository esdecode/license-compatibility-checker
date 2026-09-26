import type { Rule } from "../../types/index.js";
import { rulePrefix } from "../../utils/index.js";

/** APACHE_PATENT_NOTICE, MPL_PATENT_NOTICE, GPL_PATENT_NOTICE, CC0_PATENT_EXCLUSION, PATENT_NO_EXPRESS_GRANT. */
export const patentsRule: Rule = (ctx) => {
  const { a } = ctx;
  if (a.category === "UNKNOWN" || a.category === "PROPRIETARY") return null;

  if (a.id === "CC0-1.0") {
    return {
      ruleId: "CC0_PATENT_EXCLUSION",
      severity: "INFO",
      dimensions: ["patents"],
      message:
        "CC0-1.0 section 4(a) expressly states that no patent rights held by the affirmer are waived or licensed.",
      risks: [
        "CC0-1.0 provides no patent licence; for software, a licence with an express patent grant may be preferable.",
      ],
    };
  }

  if (a.patentGrant && a.patentRetaliation) {
    return {
      ruleId: `${rulePrefix(a)}_PATENT_NOTICE`,
      severity: "INFO",
      dimensions: ["patents"],
      message: `${a.id} includes an express patent licence from contributors. That patent licence terminates for anyone who initiates patent litigation alleging that the work infringes a patent.`,
      obligations: [],
      risks: [`Initiating patent litigation over the ${a.id} work ends your patent licence for it.`],
    };
  }

  if (a.patentGrant === false) {
    return {
      ruleId: "PATENT_NO_EXPRESS_GRANT",
      severity: "INFO",
      dimensions: ["patents"],
      message: `${a.id} contains no express patent licence. Any patent permission would depend on implied licence doctrines, which vary by jurisdiction.`,
    };
  }

  return null;
};
