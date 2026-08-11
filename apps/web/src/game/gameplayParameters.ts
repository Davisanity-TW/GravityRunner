/**
 * Gameplay tuning synchronized from the Notion Gameplay Parameters Registry.
 * Keep parameter names stable so the notion-game-parameter-sync skill can
 * safely update values without changing gameplay code.
 */
export const gameplayParameters = {
  player: {
    initialSpeedPxPerSecond: 240,
    accelerationIntervalMs: 5000,
    accelerationStepPxPerSecond: 10,
    maxSpeedPxPerSecond: 350
  },
  pursuer: {
    initialSpeedPxPerSecond: 260,
    accelerationIntervalMs: 3000,
    accelerationStepPxPerSecond: 10,
    maxSpeedPxPerSecond: 370,
    catchDistancePx: 72
  },
  terrain: { checkpointSafeBufferPx: 180 },
  endless: {
    targetCheckpointCount: 35,
    playableCheckpointBatch: 15,
    floatingPlatformStartIndex: 1,
    floatingPlatformY: 300,
    floatingPlatformWidth: 360,
    floatingPlatformHeight: 48,
    terrainStartIndex: 3,
    extraHazardsStartIndex: 10
  }
} as const;
