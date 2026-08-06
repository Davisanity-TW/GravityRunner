import {
  activateSpeedBoost,
  completeLevel,
  killPlayer,
  reachCheckpoint,
  releaseSpeedBoostZone,
  setSurfaceContact,
  type GameSimulation
} from "@gravity-runner/game-core";
import type { LevelManifest } from "@gravity-runner/shared-contracts";

export type LevelInteractionResult = {
  contactedSurface: boolean;
  reachedCheckpoint: string | null;
  died: boolean;
  completed: boolean;
  boostActivated: string | null;
  blockedByTerrain: string | null;
};

type Rectangle = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function overlaps(left: Rectangle, right: Rectangle): boolean {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

function supportsPlayer(
  platform: Rectangle,
  playerX: number,
  direction: 1 | -1
): boolean {
  const horizontalInset = 8;
  const withinX =
    playerX >= platform.x - horizontalInset &&
    playerX <= platform.x + platform.width + horizontalInset;
  if (!withinX) {
    return false;
  }

  return direction === 1
    ? platform.y >= 360
    : platform.y + platform.height <= 360;
}

export function applyLevelInteractions(
  simulation: GameSimulation,
  level: LevelManifest,
  atMs: number,
  playerSize = 48
): LevelInteractionResult {
  const result: LevelInteractionResult = {
    contactedSurface: false,
    reachedCheckpoint: null,
    died: false,
    completed: false,
    boostActivated: null,
    blockedByTerrain: null
  };

  if (simulation.state.phase !== "RUNNING") {
    return result;
  }

  const player = simulation.state.player;
  const half = playerSize / 2;
  const support = level.platforms.find((platform) =>
    supportsPlayer(platform, player.x, player.gravityDirection)
  );

  if (support !== undefined) {
    const surfaceY =
      player.gravityDirection === 1
        ? support.y - half
        : support.y + support.height + half;
    const crossedSurface =
      player.gravityDirection === 1
        ? player.y >= surfaceY && player.vy >= 0
        : player.y <= surfaceY && player.vy <= 0;

    if (crossedSurface) {
      setSurfaceContact(simulation, surfaceY, true);
      result.contactedSurface = true;
    } else if (player.isGrounded) {
      setSurfaceContact(simulation, player.y, false);
    }
  } else if (player.isGrounded) {
    setSurfaceContact(simulation, player.y, false);
  }

  const playerBounds = {
    x: simulation.state.player.x - half,
    y: simulation.state.player.y - half,
    width: playerSize,
    height: playerSize
  };
  const terrainBlock = (level.terrainBlocks ?? []).find((block) =>
    overlaps(playerBounds, block)
  );
  if (terrainBlock !== undefined) {
    simulation.state.player.x = terrainBlock.x - half;
    simulation.state.player.vx = 0;
    result.blockedByTerrain = terrainBlock.id;
  }
  const boostZones = level.boostZones ?? [];
  for (const zone of boostZones) {
    if (overlaps(playerBounds, zone)) {
      if (
        activateSpeedBoost(
          simulation,
          zone.id,
          zone.multiplier,
          zone.durationMs
        )
      ) {
        result.boostActivated = zone.id;
      }
    } else {
      releaseSpeedBoostZone(simulation, zone.id);
    }
  }
  const hazard = level.hazards.find((candidate) =>
    overlaps(playerBounds, candidate)
  );
  const outsideWorld =
    simulation.state.player.y < -half ||
    simulation.state.player.y > level.height + half;

  if (hazard !== undefined || outsideWorld) {
    killPlayer(
      simulation,
      hazard === undefined ? "void" : `hazard:${hazard.id}`,
      atMs
    );
    result.died = true;
    return result;
  }

  for (const checkpoint of level.checkpoints) {
    if (
      simulation.state.player.x >= checkpoint.x &&
      simulation.state.player.checkpointId !== checkpoint.id
    ) {
      reachCheckpoint(simulation, {
        id: checkpoint.id,
        x: checkpoint.x,
        y: checkpoint.y,
        gravityDirection: checkpoint.gravityDirection,
        atMs
      });
      if (simulation.state.player.checkpointId === checkpoint.id) {
        result.reachedCheckpoint = checkpoint.id;
      }
    }
  }

  if (overlaps(playerBounds, level.finish)) {
    completeLevel(simulation, atMs);
    result.completed = true;
  }

  return result;
}
