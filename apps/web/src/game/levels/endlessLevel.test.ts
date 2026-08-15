import { describe, expect, it } from "vitest";

import {
  beginRun,
  createGameSimulation,
  enterMenu,
  stepSimulation
} from "@gravity-runner/game-core";

import { applyLevelInteractions } from "../levelRuntime.js";
import { createEndlessLevel } from "./endlessLevel.js";

describe("endless authored route", () => {
  it("creates the second five-checkpoint batch deterministically", () => {
    const first = createEndlessLevel(1337, 20);
    const second = createEndlessLevel(1337, 20);
    expect(first.checkpoints).toHaveLength(20);
    expect(first).toEqual(second);
    expect(first.platforms).toHaveLength(30);
    expect(
      first.platforms.filter((platform) => platform.id.startsWith("endless-floating"))
    ).toHaveLength(10);
    expect(first.hazards).toHaveLength(30);
    expect(first.boostZones).toHaveLength(30);
    expect(first.terrainBlocks).toHaveLength(27);
    for (const hazard of first.hazards) {
      expect(hazard.y === 72 || hazard.y === 600).toBe(true);
    }
    for (const checkpoint of first.checkpoints) {
      const supportingPlatform = first.platforms.find(
        (platform) =>
          checkpoint.x >= platform.x &&
          checkpoint.x <= platform.x + platform.width
      );
      expect(supportingPlatform).toBeDefined();
      expect(checkpoint.x - supportingPlatform!.x).toBeGreaterThanOrEqual(180);
      expect(
        supportingPlatform!.x + supportingPlatform!.width - checkpoint.x
      ).toBeGreaterThanOrEqual(180);
    }
  });

  it("keeps the ninth checkpoint route survivable after respawn", () => {
    const level = createEndlessLevel(1337, 10);
    const simulation = createGameSimulation({
      levelId: level.id,
      levelVersion: level.version,
      playerId: "player-1",
      spawn: level.spawn,
      tuning: {
        tickRateHz: 60,
        runSpeed: 245,
        playerAccelerationIntervalMs: 5000,
        playerAccelerationStep: 10,
        playerMaxSpeed: 350,
        gravityAcceleration: 1200,
        maxVerticalSpeed: 720,
        flipVelocityDamping: 0.2,
        flipCooldownMs: 100,
        respawnDelayMs: 450,
        countdownMs: 0
      }
    });
    enterMenu(simulation);
    beginRun(simulation);
    let nextPlatform = 1;
    for (let frame = 0; frame < 3_000; frame += 1) {
      const commands = [];
      const threshold = level.platforms[nextPlatform]?.x;
      if (
        threshold !== undefined &&
        simulation.state.player.isGrounded &&
        simulation.state.player.x >= threshold - 60
      ) {
        commands.push({
          type: "FLIP_GRAVITY" as const,
          atMs: Math.floor(simulation.clockMs),
          playerId: "player-1"
        });
        nextPlatform += 1;
      }
      stepSimulation(simulation, simulation.fixedDeltaMs, commands);
      applyLevelInteractions(simulation, level, simulation.clockMs);
      if (simulation.state.player.checkpointId === "endless-9") break;
    }
    expect(simulation.state.player.checkpointId).toBe("endless-9");
    expect(simulation.state.deaths).toBe(0);
    expect(level.checkpoints[8]!.x).toBeLessThan(level.checkpoints[9]!.x);
  });

  it("keeps the final checkpoint on its platform surface after respawn", () => {
    const level = createEndlessLevel(1337, 20);
    const finalCheckpoint = level.checkpoints.at(-1)!;
    const supportingPlatform = level.platforms.find(
      (platform) =>
        finalCheckpoint.x >= platform.x &&
        finalCheckpoint.x <= platform.x + platform.width &&
        (finalCheckpoint.gravityDirection === 1
          ? finalCheckpoint.y === platform.y - 24
          : finalCheckpoint.y === platform.y + platform.height + 24)
    );

    expect(supportingPlatform).toBeDefined();
    expect(finalCheckpoint.gravityDirection).toBe(
      supportingPlatform!.y === 648 ? 1 : -1
    );
  });

});
