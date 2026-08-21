import { describe, expect, it } from "vitest";

import { signalPressureLevel } from "./levels/storyLevels.js";
import { createLevelNodeSpecs } from "./levelNodeAdapter.js";

describe("level node adapter", () => {
  it("maps every level object to a renderable node spec", () => {
    const nodes = createLevelNodeSpecs(signalPressureLevel);

    expect(nodes).toHaveLength(
      signalPressureLevel.platforms.length +
        signalPressureLevel.hazards.length +
        signalPressureLevel.boostZones!.length +
        signalPressureLevel.terrainBlocks!.length +
        signalPressureLevel.checkpoints.length +
        1
    );
    expect(nodes.filter((node) => node.kind === "platform")).toHaveLength(
      signalPressureLevel.platforms.length
    );
    expect(nodes.find((node) => node.kind === "finish")).toMatchObject({
      id: "finish",
      x: signalPressureLevel.finish.x,
      width: signalPressureLevel.finish.width
    });
  });

  it("preserves hazard and checkpoint metadata", () => {
    const nodes = createLevelNodeSpecs(signalPressureLevel);

    expect(nodes).toContainEqual(
      expect.objectContaining({
        kind: "hazard",
        id: "pressure-ceiling-teeth",
        type: "spikes"
      })
    );
    expect(nodes).toContainEqual(
      expect.objectContaining({
        kind: "checkpoint",
        id: "pressure-02",
        gravityDirection: -1
      })
    );
  });
});
