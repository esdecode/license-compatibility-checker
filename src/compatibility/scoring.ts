import type { CompatibilityStatus, Confidence, DimensionStatus, RuleFinding, Severity } from "../types/index.js";

export const SEVERITY_RANK: Record<Severity, number> = {
  INFO: 0,
  CONDITION: 1,
  WARNING: 2,
  REVIEW: 3,
  CONFLICT: 4,
  UNKNOWN: 5,
};

/**
 * Status precedence: an unidentified licence always yields UNKNOWN; a known conflict outranks the need
 * for manual review; uncertainty is never downgraded to an optimistic status.
 */
const STATUS_BY_SEVERITY: Record<Severity, CompatibilityStatus> = {
  INFO: "GENERALLY_COMPATIBLE",
  CONDITION: "COMPATIBLE_WITH_CONDITIONS",
  WARNING: "POTENTIAL_CONFLICT",
  REVIEW: "MANUAL_REVIEW_REQUIRED",
  CONFLICT: "LIKELY_INCOMPATIBLE",
  UNKNOWN: "UNKNOWN",
};

export function maxSeverity(findings: readonly RuleFinding[]): Severity {
  return findings.reduce<Severity>(
    (max, finding) => (SEVERITY_RANK[finding.severity] > SEVERITY_RANK[max] ? finding.severity : max),
    "INFO",
  );
}

export function statusFromFindings(findings: readonly RuleFinding[]): CompatibilityStatus {
  return STATUS_BY_SEVERITY[maxSeverity(findings)];
}

const CONFIDENCE_RANK: Record<Confidence, number> = { HIGH: 2, MEDIUM: 1, LOW: 0 };

export function confidenceFromFindings(findings: readonly RuleFinding[]): Confidence {
  let confidence: Confidence = "HIGH";
  for (const finding of findings) {
    const implied: Confidence =
      finding.confidence ?? (finding.severity === "UNKNOWN" || finding.severity === "REVIEW" ? "LOW" : "HIGH");
    // INFO findings do not affect the verdict, so they do not lower confidence either.
    if (finding.severity === "INFO") continue;
    if (CONFIDENCE_RANK[implied] < CONFIDENCE_RANK[confidence]) confidence = implied;
  }
  return confidence;
}

export function dimensionStatus(findings: readonly RuleFinding[]): DimensionStatus {
  if (findings.length === 0) return "OK";
  const severity = maxSeverity(findings);
  switch (severity) {
    case "INFO":
      return findings.some((finding) => finding.obligations?.length) ? "OBLIGATIONS" : "OK";
    case "CONDITION":
      return "CONDITIONS";
    case "WARNING":
      return "WARNING";
    case "REVIEW":
      return "REVIEW";
    case "CONFLICT":
      return "CONFLICT";
    case "UNKNOWN":
      return "UNKNOWN";
  }
}
