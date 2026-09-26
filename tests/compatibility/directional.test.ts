import { describe, expect, it } from "vitest";
import { check } from "../helpers.js";

describe("compatibility is directional", () => {
  const pairs: [string, string, string, string][] = [
    // [A, B, expected A->B, expected B->A]
    ["MIT", "GPL-3.0", "GENERALLY_COMPATIBLE", "POTENTIAL_CONFLICT"],
    ["Apache-2.0", "GPL-3.0", "COMPATIBLE_WITH_CONDITIONS", "POTENTIAL_CONFLICT"],
    ["GPL-3.0", "AGPL-3.0", "COMPATIBLE_WITH_CONDITIONS", "POTENTIAL_CONFLICT"],
    ["MIT", "Proprietary", "GENERALLY_COMPATIBLE", "MANUAL_REVIEW_REQUIRED"],
    ["GPL-2.0-or-later", "GPL-3.0", "COMPATIBLE_WITH_CONDITIONS", "POTENTIAL_CONFLICT"],
  ];

  it.each(pairs)("%s -> %s differs from the reverse direction", (a, b, forward, backward) => {
    expect(check(a, b, "DISTRIBUTE_BINARY").status).toBe(forward);
    expect(check(b, a, "DISTRIBUTE_BINARY").status).toBe(backward);
  });

  it("describes the direction in plain words", () => {
    expect(check("MIT", "GPL-3.0", "DEPENDENCY").direction).toBe("Using MIT-licensed code in a project under GPL-3.0");
    expect(check("GPL-3.0", "Proprietary", "DEPENDENCY").direction).toBe(
      "Using GPL-3.0-licensed code in a proprietary project",
    );
    expect(check("GPL-2.0-or-later", "MIT", "DEPENDENCY").direction).toContain("GPL-2.0-or-later");
  });
});

describe("context resolution", () => {
  it("scenario defaults can be overridden explicitly", () => {
    const result = check("GPL-3.0", "Proprietary", "SAAS", { distributed: true });
    expect(result.context.distributed).toBe(true);
    expect(result.context.networkUse).toBe(true);
  });

  it("a proprietary project licence implies finalProjectProprietary", () => {
    expect(check("MIT", "Proprietary", "DEPENDENCY").context.finalProjectProprietary).toBe(true);
    expect(check("MIT", "GPL-3.0", "DEPENDENCY").context.finalProjectProprietary).toBe(false);
  });

  it("finalProjectProprietary turns an open-source project target into a conflict for GPL code", () => {
    const result = check("GPL-3.0", "MIT", "DISTRIBUTE_BINARY", { finalProjectProprietary: true });
    expect(result.status).toBe("LIKELY_INCOMPATIBLE");
  });

  it("rejects unsupported scenarios", () => {
    expect(() => check("MIT", "MIT", "NOT_A_SCENARIO" as never)).toThrow(TypeError);
  });
});
