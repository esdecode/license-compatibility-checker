import type { Rule, RuleFinding } from "../../types/index.js";
import { SOURCES } from "../../licenses/sources/index.js";

/** AGPL_NETWORK_USE, SSPL_SERVICE_SOURCE, ELASTIC_MANAGED_SERVICE, GPL_SAAS_NO_DISTRIBUTION. */
export const networkUseRule: Rule = (ctx) => {
  const { a } = ctx;
  if (!ctx.networkUse || a.category === "UNKNOWN") return null;
  const findings: RuleFinding[] = [];
  const closed = ctx.b.category === "PROPRIETARY" || ctx.finalProjectProprietary;

  if (a.id === "AGPL-3.0") {
    if (ctx.modified) {
      findings.push({
        ruleId: "AGPL_NETWORK_USE",
        severity: closed ? "CONFLICT" : "CONDITION",
        dimensions: ["networkUse", "sourceDisclosure", "proprietaryUse"],
        message:
          "AGPL-3.0 section 13: if you modify the program, users interacting with it remotely over a network must be offered the Corresponding Source of your modified version, even if it is never distributed." +
          (closed
            ? " That is generally incompatible with keeping the service's code for that program proprietary."
            : ""),
        obligations: [
          "Offer the Corresponding Source of the modified AGPL-3.0 program to all users interacting with it over the network.",
        ],
        risks: closed
          ? [
              "Running a modified AGPL-3.0 program as a closed SaaS without offering its source is generally a licence violation.",
            ]
          : [],
        recommendations: closed
          ? [
              "Keep the AGPL-3.0 program unmodified and separate, release the combined source under AGPL-3.0, or obtain a commercial licence.",
            ]
          : [],
        sources: [SOURCES.gplFaq],
      });
    } else {
      findings.push({
        ruleId: "AGPL_NETWORK_USE",
        severity: closed ? "WARNING" : "INFO",
        dimensions: ["networkUse", "sourceDisclosure"],
        message:
          "AGPL-3.0 section 13 applies to modified versions offered over a network. Running an unmodified AGPL-3.0 program does not by itself trigger it, but integrating AGPL-3.0 code into your own service code (linking, importing, patching) generally creates a modified version.",
        risks: [
          "Depending on how the component is combined with your service, the network source-offer obligation may apply to your code.",
        ],
        recommendations: [
          "Confirm whether the AGPL-3.0 code is used unmodified and as a separate program, or combined into your application.",
        ],
        sources: [SOURCES.gplFaq],
        confidence: "MEDIUM",
      });
    }
  }

  if (a.id === "SSPL-1.0") {
    findings.push({
      ruleId: "SSPL_SERVICE_SOURCE",
      severity: closed ? "CONFLICT" : "WARNING",
      dimensions: ["networkUse", "sourceDisclosure", "commercialUse", "proprietaryUse"],
      message:
        "SSPL-1.0 section 13: offering the program's functionality as a service to third parties requires releasing the Service Source Code, meaning the software used to make the program available as a service (management, user interfaces, APIs, automation, monitoring, backup, storage, hosting), under SSPL-1.0.",
      risks: [
        "Offering an SSPL-1.0 program's functionality to third parties as a service with a closed service stack is generally not permitted.",
      ],
      recommendations: [
        "If the service exposes the SSPL program's functionality to third parties, obtain a commercial licence from the vendor.",
      ],
      sources: [...ctx.a.sources],
      confidence: "MEDIUM",
    });
  }

  if (a.id === "Elastic-2.0") {
    findings.push({
      ruleId: "ELASTIC_MANAGED_SERVICE",
      severity: "WARNING",
      dimensions: ["networkUse", "commercialUse"],
      message:
        "Elastic-2.0 prohibits providing the software to third parties as a hosted or managed service where users get access to any substantial set of its features or functionality. Using it internally behind your own product may be permitted.",
      risks: [
        "A SaaS that exposes a substantial set of the Elastic-2.0 software's features to customers is generally not permitted.",
      ],
      recommendations: [
        "Confirm that customers do not get access to a substantial set of the Elastic-2.0 software's features.",
      ],
      sources: [...ctx.a.sources],
      confidence: "MEDIUM",
    });
  }

  if ((a.id === "GPL-2.0" || a.id === "GPL-3.0") && !ctx.distributed) {
    findings.push({
      ruleId: "GPL_SAAS_NO_DISTRIBUTION",
      severity: "CONDITION",
      dimensions: ["networkUse", "distribution", "sourceDisclosure"],
      message: `${a.id} has no network-use clause: running ${a.id} code on your servers to provide a service, without distributing it, generally does not require releasing source. This depends on the code not being distributed.`,
      obligations: [
        `Do not distribute the ${a.id}-based software (including as downloadable apps, on-premise installers or client-side code).`,
      ],
      risks: [
        `Code sent to users' browsers or devices (e.g. JavaScript bundles, mobile apps) is distributed; if it contains ${a.id} code, the copyleft conditions apply to it.`,
      ],
      sources: [SOURCES.gplFaqSaas],
    });
  }

  return findings;
};
