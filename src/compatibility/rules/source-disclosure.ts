import type { Rule, SourceDisclosureScope } from "../../types/index.js";
import { rulePrefix } from "../../utils/index.js";

const SCOPE_TEXT: Record<Exclude<SourceDisclosureScope, "NONE" | "UNKNOWN">, string> = {
  MODIFIED_FILES: "the licensed files and your modifications to them",
  LIBRARY_AND_MODIFICATIONS: "the library and your modifications to it",
  MODULE_AND_MODIFICATIONS: "the licensed program and your modifications to it",
  DERIVATIVE_WORK: "the complete corresponding source of the whole distributed work based on it",
  SERVICE_STACK: "the whole work and, when offered as a service, the Service Source Code",
};

/** <PREFIX>_SOURCE_DISCLOSURE: what must be published when the obligation is triggered. */
export const sourceDisclosureRule: Rule = (ctx) => {
  const { a } = ctx;
  if (a.category === "UNKNOWN" || a.category === "PROPRIETARY") return null;
  if (a.sourceDisclosure === "NONE") {
    return {
      ruleId: "NO_SOURCE_DISCLOSURE",
      severity: "INFO",
      dimensions: ["sourceDisclosure"],
      message: `${a.id} does not require you to publish source code.`,
    };
  }
  if (a.sourceDisclosure === "UNKNOWN") return null;

  const triggered = ctx.distributed || (a.networkCopyleft === true && ctx.networkUse);
  return {
    ruleId: `${rulePrefix(a)}_SOURCE_DISCLOSURE`,
    severity: "INFO",
    dimensions: ["sourceDisclosure"],
    message: triggered
      ? `When the obligation applies, ${a.id} requires making available ${SCOPE_TEXT[a.sourceDisclosure]}.`
      : `${a.id} source-disclosure obligations (${SCOPE_TEXT[a.sourceDisclosure]}) are not triggered in this scenario because the software is not distributed${a.networkCopyleft ? " or offered over a network" : ""}.`,
  };
};
