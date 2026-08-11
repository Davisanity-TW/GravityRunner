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
  const basePlatforms = chunks.map((chunk, index) => ({
    id: `endless-${chunk.id}-${index}`,
    x: startX + chunks.slice(0, index).reduce((sum, item) => sum + item.width, 0),
    y: chunk.entryGravity === 1 ? 648 : 0,
    width: chunk.width,
    height: 72
  }));
  const platforms = [...basePlatforms];
  for (let index = 1; index < Math.min(checkpointCount, 10); index += 2) {
    const basePlatform = basePlatforms[index]!;
    platforms.push({
      id: `endless-floating-${index + 1}`,
      x: basePlatform.x + 280,
      y: 300,
      width: 360,
      height: 48
    });
  }
  const checkpointBuffer = 180;
  const checkpoints = chunks.map((chunk, index) => {
    if (index === chunks.length - 2) {
      const currentPlatform = basePlatforms[index]!;
      return {
        id: `endless-${index + 1}`,
        x: currentPlatform.x + currentPlatform.width - checkpointBuffer,
        y: chunk.entryGravity === 1 ? 624 : 96,
        gravityDirection: chunk.entryGravity
      };
    }
    const landingPlatform = basePlatforms[index + 1] ?? basePlatforms[index]!;
    const landingGravity = chunks[index + 1]?.entryGravity ?? chunk.exitGravity;
    const maxSafeX = landingPlatform.x + landingPlatform.width - checkpointBuffer;
    return {
      id: `endless-${index + 1}`,
      x: Math.min(landingPlatform.x + checkpointBuffer, maxSafeX),
      y: landingGravity === 1 ? 624 : 96,
      gravityDirection: landingGravity
    };
  });
  const hazards = chunks.flatMap((chunk, index) => {
    const platform = basePlatforms[index]!;
    const count = index >= 10 ? 2 : 1;
    return Array.from({ length: count }, (_, hazardIndex) => ({
      id: `endless-hazard-${index + 1}-${hazardIndex + 1}`,
      type: (index + hazardIndex) % 2 === 0 ? "electric" : "spikes",
      x: platform.x + Math.floor(chunk.width * (hazardIndex === 0 ? 0.48 : 0.78)),
      y: chunk.entryGravity === 1 ? 72 : 600,
      width: 72 + index * 4 + hazardIndex * 8,
      height: 48
    }));
  });
  const boostZones = chunks.flatMap((chunk, index) => {
    const platform = basePlatforms[index]!;
    const count = index >= 10 ? 2 : 1;
    return Array.from({ length: count }, (_, boostIndex) => ({
      id: `endless-boost-${index + 1}-${boostIndex + 1}`,
      x: platform.x + Math.floor(chunk.width * (boostIndex === 0 ? 0.18 : 0.58)),
      y: chunk.entryGravity === 1 ? 576 : 96,
      width: 120,
      height: 48,
      durationMs: 2_000,
      multiplier: 1.15 + index * 0.025 + boostIndex * 0.05
    }));
  });
  const terrainBlocks = chunks.flatMap((chunk, index) => {
    if (index < 3) return [];
    const platform = basePlatforms[index]!;
    const count = index >= 10 ? 2 : 1;
    return Array.from({ length: count }, (_, blockIndex) => ({
      id: `endless-block-${index + 1}-${blockIndex + 1}`,
      x: platform.x + Math.floor(chunk.width * (blockIndex === 0 ? 0.68 : 0.86)),
      y: blockIndex === 0 ? 220 : 180,
      width: 80 + index * 4 + blockIndex * 8,
      height: blockIndex === 0 ? 300 : 340
    }));
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
