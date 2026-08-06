import type { GravityDirection } from "@gravity-runner/shared-contracts";

export type EndlessDifficulty = 0 | 1 | 2 | 3;

export type EndlessChunk = {
  id: string;
  width: number;
  entryGravity: GravityDirection;
  exitGravity: GravityDirection;
  difficulty: EndlessDifficulty;
};

export type EndlessChunkSelection = EndlessChunk & {
  distanceStart: number;
  generatorVersion: number;
  seed: number;
};

export type EndlessScheduler = {
  seed: number;
  generatorVersion: number;
  selectNext(distanceStart: number, entryGravity: GravityDirection): EndlessChunkSelection;
};

const catalog: readonly Omit<EndlessChunk, "difficulty">[] = [
  { id: "relay", width: 960, entryGravity: 1, exitGravity: -1 },
  { id: "switchback", width: 1_120, entryGravity: -1, exitGravity: 1 },
  { id: "split", width: 1_280, entryGravity: 1, exitGravity: -1 },
  { id: "pulse", width: 1_440, entryGravity: -1, exitGravity: 1 }
];

function mix(seed: number, distanceStart: number): number {
  let value = (seed ^ Math.floor(distanceStart / 64)) >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
}

export function getEndlessDifficulty(distanceStart: number): EndlessDifficulty {
  if (distanceStart >= 12_000) return 3;
  if (distanceStart >= 8_000) return 2;
  if (distanceStart >= 4_000) return 1;
  return 0;
}

export function createEndlessScheduler(
  seed: number,
  generatorVersion = 1
): EndlessScheduler {
  const normalizedSeed = seed >>> 0;
  return {
    seed: normalizedSeed,
    generatorVersion,
    selectNext(distanceStart, entryGravity) {
      const compatible = catalog.filter(
        (chunk) => chunk.entryGravity === entryGravity
      );
      const index = mix(normalizedSeed, distanceStart) % compatible.length;
      const chunk = compatible[index] ?? compatible[0]!;
      return {
        ...chunk,
        difficulty: getEndlessDifficulty(distanceStart),
        distanceStart,
        generatorVersion,
        seed: normalizedSeed
      };
    }
  };
}
