import type { LevelManifest } from "@gravity-runner/shared-contracts";

export const validLevelFixture = {
  id: "signal-vault",
  version: 2,
  name: "Signal Vault",
  theme: "neon-archive",
  width: 2400,
  height: 720,
  runSpeed: 240,
  spawn: { x: 120, y: 600, gravityDirection: 1 },
  finish: { x: 2320, y: 80, width: 40, height: 560 },
  checkpoints: [
    { id: "cp-1", x: 800, y: 600, gravityDirection: 1 },
    { id: "cp-2", x: 1600, y: 80, gravityDirection: -1 }
  ],
  platforms: [
    { id: "floor-1", x: 0, y: 650, width: 1100, height: 70 },
    { id: "ceiling-1", x: 900, y: 0, width: 900, height: 70 },
    { id: "floor-2", x: 1800, y: 650, width: 600, height: 70 }
  ],
  hazards: [
    {
      id: "spark-1",
      type: "electric",
      x: 720,
      y: 610,
      width: 40,
      height: 40
    }
  ]
} as const satisfies LevelManifest;

export const duplicateIdLevelFixture = {
  ...validLevelFixture,
  hazards: [
    {
      id: "floor-1",
      type: "spikes",
      x: 720,
      y: 610,
      width: 40,
      height: 40
    }
  ]
} as const satisfies LevelManifest;

export const invalidDimensionsLevelFixture = {
  ...validLevelFixture,
  platforms: [
    { id: "floor-1", x: 0, y: 650, width: 0, height: 70 },
    ...validLevelFixture.platforms.slice(1)
  ]
} as const satisfies LevelManifest;

export const invalidSpawnLevelFixture = {
  ...validLevelFixture,
  spawn: { x: 2500, y: 600, gravityDirection: 1 }
} as const satisfies LevelManifest;

export const unorderedCheckpointsLevelFixture = {
  ...validLevelFixture,
  checkpoints: [
    { id: "cp-2", x: 1600, y: 80, gravityDirection: -1 },
    { id: "cp-1", x: 800, y: 600, gravityDirection: 1 }
  ]
} as const satisfies LevelManifest;

export const unsupportedHazardLevelFixture = {
  ...validLevelFixture,
  hazards: [
    {
      id: "mystery-1",
      type: "teleporter",
      x: 720,
      y: 610,
      width: 40,
      height: 40
    }
  ]
} as const satisfies LevelManifest;
