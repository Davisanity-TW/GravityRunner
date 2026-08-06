import { describe, expect, it } from "vitest";

import { validateLevelManifest } from "@gravity-runner/level-format";

import { signalPressureLevel, signalSwitchbackLevel } from "./storyLevels.js";

describe("authored Story level manifests", () => {
  it("validates Level 2 geometry and checkpoints", () => {
    expect(validateLevelManifest(signalSwitchbackLevel)).toEqual([]);
    expect(
      signalSwitchbackLevel.hazards.some((hazard) => hazard.type === "electric")
    ).toBe(true);
  });

  it("validates Level 3 geometry and its two checkpoints", () => {
    expect(validateLevelManifest(signalPressureLevel)).toEqual([]);
    expect(signalPressureLevel.checkpoints).toHaveLength(2);
    expect("boundarySegments" in signalPressureLevel).toBe(false);
  });
});
