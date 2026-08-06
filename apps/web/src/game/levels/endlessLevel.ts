import {
  createEndlessScheduler,
  type EndlessChunkSelection
} from "@gravity-runner/game-core";
import type { LevelManifest } from "@gravity-runner/shared-contracts";

export const ENDLESS_CHECKPOINT_BATCH = 10;

export function createEndlessLevel(
  seed = 1337,
  checkpointCount = ENDLESS_CHECKPOINT_BATCH
): LevelManifest {
  const scheduler = createEndlessScheduler(seed);
  const chunks: EndlessChunkSelection[] = [];
  let distance = 0;
  let entryGravity = 1 as 1 | -1;
  for (let index = 0; index < checkpointCount; index += 1) {
    const chunk = scheduler.selectNext(distance, entryGravity);
    chunks.push(chunk);
    distance += chunk.width;
    entryGravity = chunk.exitGravity;
  }

  const startX = 160;
  const platforms = chunks.map((chunk, index) => ({
    id: `endless-${chunk.id}-${index}`,
    x: startX + chunks.slice(0, index).reduce((sum, item) => sum + item.width, 0),
    y: chunk.entryGravity === 1 ? 648 : 0,
    width: chunk.width,
    height: 72
  }));
  const checkpointBuffer = 180;
  const checkpoints = chunks.map((chunk, index) => {
    const landingPlatform = platforms[index + 1] ?? platforms[index]!;
    const landingGravity = chunks[index + 1]?.entryGravity ?? chunk.exitGravity;
    const maxSafeX = landingPlatform.x + landingPlatform.width - checkpointBuffer;
    return {
      id: `endless-${index + 1}`,
      x: Math.min(landingPlatform.x + checkpointBuffer, maxSafeX),
      y: landingGravity === 1 ? 624 : 96,
      gravityDirection: landingGravity
    };
  });
  const hazards = chunks.slice(5).map((chunk, index) => {
    const platform = platforms[index + 5]!;
    return {
      id: `endless-hazard-${index + 6}`,
      type: index % 2 === 0 ? "electric" : "spikes",
      x: platform.x + Math.floor(chunk.width * 0.48),
      y: chunk.entryGravity === 1 ? 600 : 72,
      width: 72 + index * 8,
      height: 48
    };
  });
  const boostZones = chunks.slice(5).map((chunk, index) => {
    const platform = platforms[index + 5]!;
    return {
      id: `endless-boost-${index + 6}`,
      x: platform.x + Math.floor(chunk.width * 0.18),
      y: chunk.entryGravity === 1 ? 576 : 96,
      width: 120,
      height: 48,
      durationMs: 2_000,
      multiplier: 1.15 + index * 0.05
    };
  });
  const terrainBlocks = chunks.slice(5).map((chunk, index) => {
    const platform = platforms[index + 5]!;
    return {
      id: `endless-block-${index + 6}`,
      x: platform.x + Math.floor(chunk.width * 0.72),
      y: index % 2 === 0 ? 220 : 180,
      width: 80 + index * 8,
      height: index % 2 === 0 ? 300 : 340
    };
  });
  const width = startX + distance + 160;

  return {
    id: `endless-${seed}`,
    version: 1,
    name: "Endless Relay",
    theme: "endless-relay",
    width,
    height: 720,
    runSpeed: 245,
    spawn: { x: startX, y: 624, gravityDirection: 1 },
    finish: { x: width - 120, y: 72, width: 72, height: 576 },
    checkpoints,
    platforms,
    hazards,
    boostZones,
    terrainBlocks
  };
}
