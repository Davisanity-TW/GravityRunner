import {
  createEndlessScheduler,
  type EndlessChunkSelection
} from "@gravity-runner/game-core";
import type { LevelManifest } from "@gravity-runner/shared-contracts";

export const ENDLESS_CHECKPOINT_BATCH = 5;

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
  const checkpoints = chunks.map((chunk, index) => ({
    id: `endless-${index + 1}`,
    x: platforms[index]!.x + chunk.width - 96,
    y: chunk.exitGravity === 1 ? 624 : 96,
    gravityDirection: chunk.exitGravity
  }));
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
    hazards: []
  };
}
