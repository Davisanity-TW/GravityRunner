import {
  beginRun,
  createGameSimulation,
  enterMenu,
  stepSimulation
} from "@gravity-runner/game-core";
import { describe, expect, it } from "vitest";

import { applyLevelInteractions } from "./levelRuntime.js";
import { signalVaultLevel } from "./levels/signalVault.js";
import { signalPressureLevel } from "./levels/storyLevels.js";

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

function createRunningPressureSimulation() {
  const simulation = createGameSimulation({
    levelId: signalPressureLevel.id,
    levelVersion: signalPressureLevel.version,
    playerId: "player-1",
    spawn: signalPressureLevel.spawn,
    tuning: {
      ...tuning,
      runSpeed: signalPressureLevel.runSpeed
    },
    pursuit: {
      enabled: true,
      gracePeriodMs: 4500,
      initialDistance: 560,
      speed: 270,
      catchDistance: 72
    }
  });
  enterMenu(simulation);
  beginRun(simulation);
  stepSimulation(simulation, simulation.fixedDeltaMs);
  applyLevelInteractions(simulation, signalPressureLevel, simulation.clockMs);
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

  it("completes the Pressure Finale route with deterministic pressure respawns", () => {
    const simulation = createRunningPressureSimulation();
    const flipAt = [700, 1050, 2100, 2800, 3500];
    let nextFlip = 0;

    for (let frame = 0; frame < 1_800; frame += 1) {
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
      applyLevelInteractions(
        simulation,
        signalPressureLevel,
        simulation.clockMs
      );
      if (simulation.state.phase === "LEVEL_COMPLETE") {
        break;
      }
    }

    expect(simulation.state.deaths).toBe(2);
    expect(simulation.state.player.checkpointId).toBe("pressure-02");
    expect(simulation.state.phase).toBe("LEVEL_COMPLETE");
    expect(simulation.events.map((event) => event.type)).toEqual([
      "PLAYER_FLIPPED",
      "PLAYER_FLIPPED",
      "PLAYER_FLIPPED",
      "CHECKPOINT_REACHED",
      "PLAYER_DIED",
      "PLAYER_FLIPPED",
      "PLAYER_DIED",
      "PLAYER_FLIPPED",
      "CHECKPOINT_REACHED",
      "LEVEL_COMPLETED"
    ]);
  });

  it("activates authored boost zones when the player crosses them", () => {
    const simulation = createRunningPressureSimulation();
    simulation.state.player.x = 1400;
    simulation.state.player.y = 384;

    const interaction = applyLevelInteractions(
      simulation,
      signalPressureLevel,
      simulation.clockMs
    );

    expect(interaction.boostActivated).toBe("pressure-boost-floor");
    stepSimulation(simulation, simulation.fixedDeltaMs);
    expect(simulation.state.player.vx).toBe(
      signalPressureLevel.runSpeed * 1.25
    );
  });

  it("blocks forward movement at authored terrain walls", () => {
    const simulation = createRunningPressureSimulation();
    simulation.state.player.x = 2860;
    simulation.state.player.y = 360;
    simulation.state.player.gravityDirection = 1;

    const interaction = applyLevelInteractions(
      simulation,
      signalPressureLevel,
      simulation.clockMs
    );

    expect(interaction.blockedByTerrain).toBe("pressure-mid-lane-block");
    expect(simulation.state.player.x).toBe(2836);
    expect(simulation.state.player.vx).toBe(0);
  });

  it("allows landing on both sides of a terrain block", () => {
    const top = createRunningPressureSimulation();
    top.state.player.x = 2860;
    top.state.player.y = 200;
    top.state.player.vy = 120;
    top.state.player.gravityDirection = 1;
    applyLevelInteractions(top, signalPressureLevel, top.clockMs);
    expect(top.state.player.y).toBe(196);
    expect(top.state.player.isGrounded).toBe(true);

    const bottom = createRunningPressureSimulation();
    bottom.state.player.x = 2860;
    bottom.state.player.y = 540;
    bottom.state.player.vy = -120;
    bottom.state.player.gravityDirection = -1;
    applyLevelInteractions(bottom, signalPressureLevel, bottom.clockMs);
    expect(bottom.state.player.y).toBe(544);
    expect(bottom.state.player.isGrounded).toBe(true);
  });

  it("does not snap a ceiling runner to a platform while moving away", () => {
    const simulation = createRunningPressureSimulation();
    simulation.state.player.x = 1400;
    simulation.state.player.y = 96;
    simulation.state.player.vy = 180;
    simulation.state.player.gravityDirection = -1;
    simulation.state.player.isGrounded = false;

    applyLevelInteractions(simulation, signalPressureLevel, simulation.clockMs);

    expect(simulation.state.player.y).toBe(96);
    expect(simulation.state.player.isGrounded).toBe(false);
  });

  it("lands on the upper floating platform when moving toward its underside", () => {
    const simulation = createRunningPressureSimulation();
    simulation.state.player.x = 1400;
    simulation.state.player.y = 330;
    simulation.state.player.vy = -120;
    simulation.state.player.gravityDirection = -1;
    simulation.state.player.isGrounded = false;

    applyLevelInteractions(simulation, signalPressureLevel, simulation.clockMs);

    expect(simulation.state.player.y).toBe(336);
    expect(simulation.state.player.isGrounded).toBe(true);
  });
});
