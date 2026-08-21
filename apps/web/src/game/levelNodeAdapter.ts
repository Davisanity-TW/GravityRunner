import type { LevelManifest } from "@gravity-runner/shared-contracts";

export type LevelNodeSpec =
  | {
      kind: "platform";
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }
  | {
      kind: "hazard";
      id: string;
      type: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }
  | {
      kind: "boost-zone";
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      durationMs: number;
      multiplier: number;
    }
  | {
      kind: "terrain-block";
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }
  | {
      kind: "checkpoint";
      id: string;
      x: number;
      y: number;
      gravityDirection: 1 | -1;
    }
  | {
      kind: "finish";
      id: "finish";
      x: number;
      y: number;
      width: number;
      height: number;
    };

export function createLevelNodeSpecs(
  level: LevelManifest
): readonly LevelNodeSpec[] {
  return [
    ...level.platforms.map((platform) => ({
      kind: "platform" as const,
      ...platform
    })),
    ...level.hazards.map((hazard) => ({
      kind: "hazard" as const,
      ...hazard
    })),
    ...(level.boostZones ?? []).map((zone) => ({
      kind: "boost-zone" as const,
      ...zone
    })),
    ...(level.terrainBlocks ?? []).map((block) => ({
      kind: "terrain-block" as const,
      ...block
    })),
    ...level.checkpoints.map((checkpoint) => ({
      kind: "checkpoint" as const,
      id: checkpoint.id,
      x: checkpoint.x,
      y: checkpoint.y,
      gravityDirection: checkpoint.gravityDirection
    })),
    {
      kind: "finish" as const,
      id: "finish" as const,
      ...level.finish
    }
  ];
}
