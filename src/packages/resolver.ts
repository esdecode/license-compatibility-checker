import { normalizeLicense } from "../licenses/index.js";
import type { Dependency, LicenseResolver, ResolvedLicense } from "./types.js";
import { parseSpdxExpression, SpdxExpressionError, spdxLeaves, spdxOperators } from "./spdx-expression.js";

/**
 * Resolve a declared licence expression to engine licence ids. Never guesses:
 * - no declared licence -> UNKNOWN
 * - unparsable expression or any unrecognized identifier -> UNKNOWN
 * - `LicenseRef-*` or `X WITH exception` -> Custom (terms must be reviewed)
 */
export function resolveLicenseExpression(expression: string | null): ResolvedLicense {
  if (!expression?.trim()) return { status: "UNKNOWN", expression: null, reason: "No licence declared." };
  let tree;
  try {
    tree = parseSpdxExpression(expression);
  } catch (error) {
    if (error instanceof SpdxExpressionError) {
      // A single free-text value (e.g. "MIT License") may still be a recognized alias.
      const single = normalizeLicense(expression);
      if (single.recognized && single.id !== "Unknown") {
        return { status: "RESOLVED", expression, licenseIds: [expression.trim()], operator: "SINGLE" };
      }
      return { status: "UNKNOWN", expression, reason: error.message };
    }
    throw error;
  }

  const ids: string[] = [];
  for (const leaf of spdxLeaves(tree)) {
    if (leaf.exception || /^(LicenseRef|DocumentRef)-/i.test(leaf.id)) {
      ids.push("Custom");
      continue;
    }
    const normalized = normalizeLicense(leaf.id);
    if (!normalized.recognized || normalized.id === "Unknown") {
      return { status: "UNKNOWN", expression, reason: `Unrecognized licence identifier "${leaf.id}".` };
    }
    ids.push(leaf.id);
  }

  const operators = spdxOperators(tree);
  const operator =
    operators.size === 0 ? "SINGLE" : operators.size === 2 ? "COMPLEX" : operators.has("and") ? "AND" : "OR";
  return { status: "RESOLVED", expression, licenseIds: [...new Set(ids)], operator };
}

/** Resolves only licences declared in the parsed file. Registry lookups belong in a separate resolver. */
export const declaredLicenseResolver: LicenseResolver = {
  resolve: (dependency: Dependency) =>
    dependency.licenseEvidence === "NOT_AVAILABLE"
      ? { status: "UNKNOWN", expression: null, reason: "The file does not declare this dependency's licence." }
      : resolveLicenseExpression(dependency.declaredLicense),
};
