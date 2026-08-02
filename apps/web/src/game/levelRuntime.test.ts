import {
  beginRun,
  createGameSimulation,
  enterMenu,
  stepSimulation
} from "@gravity-runner/game-core";
import { describe, expect, it } from "vitest";

import { applyLevelInteractions } from "./levelRuntime.js";
import { signalVaultLevel } from "./levels/signalVault.js";

const tuning = {
  tickRateHz: 60,
  runSpeed: signalVaultLevel.runSpeed,
  gravityAcceleration: 1200,
  maxVerticalSpeed: 720,
  flipVelocityDamping: 0.2,
  flipCooldownMs: 100,
  respawnDelayMs: 300,
  countdownMs: 0
} as const;

function createRunningSimulation() {
  const simulation = createGameSimulation({
    levelId: signalVaultLevel.id,
    levelVersion: signalVaultLevel.version,
    playerId: "player-1",
    spawn: signalVaultLevel.spawn,
    tuning
  });
  enterMenu(simulation);
  beginRun(simulation);
  stepSimulation(simulation, simulation.fixedDeltaMs);
  applyLevelInteractions(simulation, signalVaultLevel, simulation.clockMs);
  return simulation;
}

describe("data-driven level interactions", () => {
  it("arms gravity input only while supported by a surface", () => {
    const simulation = createRunningSimulation();
    expect(simulation.state.player.isGrounded).toBe(true);

    stepSimulation(simulation, simulation.fixedDeltaMs, [
      { type: "FLIP_GRAVITY", atMs: 20, playerId: "player-1" }
    ]);
    applyLevelInteractions(simulation, signalVaultLevel, simulation.clockMs);
    expect(simulation.state.player.isGrounded).toBe(false);

    simulation.state.player.x = 1300;
    simulation.state.player.y = 80;
    applyLevelInteractions(simulation, signalVaultLevel, simulation.clockMs);
    expect(simulation.state.player).toMatchObject({
      y: 96,
      gravityDirection: -1,
      isGrounded: true
    });
  });

  it("kills hazards and respawns from the latest checkpoint", () => {
    const simulation = createRunningSimulation();
    simulation.state.player.gravityDirection = -1;
    simulation.state.player.x = 2240;
    applyLevelInteractions(simulation, signalVaultLevel, 1000);
    expect(simulation.state.player.checkpointId).toBe("relay-01");

    simulation.state.player.x = 1140;
    simulation.state.player.y = 624;
    const interaction = applyLevelInteractions(
      simulation,
      signalVaultLevel,
      1200
    );
    expect(interaction.died).toBe(true);
    expect(simulation.state.phase).toBe("DEAD");

    stepSimulation(simulation, 350);
    expect(simulation.state.player).toMatchObject({
      x: 2240,
      y: 624,
      gravityDirection: 1,
      checkpointId: "relay-01",
      alive: true
    });
  });

  it("completes when the player overlaps the finish trigger", () => {
    const simulation = createRunningSimulation();
    simulation.state.player.x = signalVaultLevel.finish.x + 10;
    simulation.state.player.y = 624;

    const interaction = applyLevelInteractions(
      simulation,
      signalVaultLevel,
      5000
    );

    expect(interaction.completed).toBe(true);
    expect(simulation.state.phase).toBe("LEVEL_COMPLETE");
  });

  it("supports a no-death route through every alternating surface", () => {
    const simulation = createRunningSimulation();
    const flipAt = [850, 1500, 2450, 3100];
    let nextFlip = 0;

    for (let frame = 0; frame < 1_200; frame += 1) {
      const commands = [];
      const threshold = flipAt[nextFlip];
      if (
        threshold !== undefined &&
        simulation.state.player.isGrounded &&
        simulation.state.player.x >= threshold
      ) {
        commands.push({
          type: "FLIP_GRAVITY" as const,
          atMs: Math.floor(simulation.clockMs),
          playerId: "player-1"
        });
        nextFlip += 1;
      }

      stepSimulation(simulation, simulation.fixedDeltaMs, commands);
      applyLevelInteractions(simulation, signalVaultLevel, simulation.clockMs);
      if (simulation.state.phase === "LEVEL_COMPLETE") {
        break;
      }
    }

    expect(simulation.state.deaths).toBe(0);
    expect(simulation.state.player.checkpointId).toBe("relay-01");
    expect(simulation.state.phase).toBe("LEVEL_COMPLETE");
  });
});
