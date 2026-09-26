import { checkCompatibility } from "../src/index.js";
import type { CompatibilityInput, CompatibilityResult, Scenario } from "../src/index.js";

export function check(
  licenseA: string,
  licenseB: string,
  scenario: Scenario,
  options: Omit<CompatibilityInput, "licenseA" | "licenseB" | "scenario"> = {},
): CompatibilityResult {
  return checkCompatibility({ licenseA, licenseB, scenario, ...options });
}

export const ruleIds = (result: CompatibilityResult): string[] =>
  result.diagnostics.triggeredRules.map((rule) => rule.ruleId);
