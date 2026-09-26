import { UnsupportedManifestError } from "../types.js";

export function parseJsonObject(content: string, kind: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(content.charCodeAt(0) === 0xfeff ? content.slice(1) : content);
  } catch (error) {
    throw new UnsupportedManifestError(`${kind} is not valid JSON: ${(error as Error).message}`);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new UnsupportedManifestError(`${kind} must contain a JSON object.`);
  }
  return value as Record<string, unknown>;
}

export const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

export const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

/**
 * Declared licence field. Accepts an SPDX string or, for composer, an array (which composer defines as OR).
 * Legacy npm objects ({ type }) and arrays are accepted only in their documented shapes.
 */
export function declaredLicense(value: unknown, arrayOperator: "OR" | "AND" = "OR"): string | null {
  const direct = asString(value);
  if (direct) return direct;
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => asString(item) ?? asString(asRecord(item).type))
      .filter((item): item is string => !!item);
    if (!parts.length) return null;
    return parts.length === 1 ? (parts[0] ?? null) : `(${parts.join(` ${arrayOperator} `)})`;
  }
  return asString(asRecord(value).type);
}
