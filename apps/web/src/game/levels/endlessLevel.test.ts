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
  });
});
