import { describe, expect, it } from "vitest";

import { createEndlessLevel } from "./endlessLevel.js";

describe("endless authored route", () => {
  it("creates the second five-checkpoint batch deterministically", () => {
    const first = createEndlessLevel(1337, 10);
    const second = createEndlessLevel(1337, 10);
    expect(first.checkpoints).toHaveLength(10);
    expect(first).toEqual(second);
    expect(first.platforms).toHaveLength(10);
    expect(first.hazards).toHaveLength(5);
    expect(first.boostZones).toHaveLength(5);
    expect(first.terrainBlocks).toHaveLength(5);
    for (const checkpoint of first.checkpoints) {
      const supportingPlatform = first.platforms.find(
        (platform) =>
          checkpoint.x >= platform.x &&
          checkpoint.x <= platform.x + platform.width
      );
      expect(supportingPlatform).toBeDefined();
      expect(checkpoint.x - supportingPlatform!.x).toBeGreaterThanOrEqual(180);
      expect(
        supportingPlatform!.x + supportingPlatform!.width - checkpoint.x
      ).toBeGreaterThanOrEqual(180);
    }
  });
});
