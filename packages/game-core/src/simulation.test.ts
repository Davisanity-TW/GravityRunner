import { describe, expect, it } from "vitest";

import {
  beginRun,
  completeLevel,
  createGameSimulation,
  enterMenu,
  getSimulationResult,
  killPlayer,
  reachCheckpoint,
  stepSimulation,
  type GameSimulation
} from "./index.js";

const tuning = {
  tickRateHz: 60,
  runSpeed: 240,
  gravityAcceleration: 1200,
  maxVerticalSpeed: 720,
  flipVelocityDamping: 0.2,
  flipCooldownMs: 100,
  respawnDelayMs: 300,
  countdownMs: 200
} as const;

function createRunningSimulation(): GameSimulation {
  const simulation = createGameSimulation({
    levelId: "signal-vault",
    levelVersion: 1,
    playerId: "player-1",
    spawn: { x: 100, y: 600, gravityDirection: 1 },
    tuning
  });

  enterMenu(simulation);
  beginRun(simulation);
  stepSimulation(simulation, 250);
  expect(simulation.state.phase).toBe("RUNNING");

  return simulation;
}

describe("fixed-step state machine", () => {
  it("follows boot, menu, countdown and running phases", () => {
    const simulation = createGameSimulation({
      levelId: "signal-vault",
      levelVersion: 1,
      playerId: "player-1",
      spawn: { x: 100, y: 600, gravityDirection: 1 },
      tuning
    });

    expect(simulation.state.phase).toBe("BOOT");
    enterMenu(simulation);
    expect(simulation.state.phase).toBe("MENU");
    beginRun(simulation);
    expect(simulation.state.phase).toBe("COUNTDOWN");
    stepSimulation(simulation, 250);
    expect(simulation.state.phase).toBe("RUNNING");
  });

  it("produces identical state and events for identical replays", () => {
    const replay = () => {
      const simulation = createRunningSimulation();
      const commands = [
        { type: "FLIP_GRAVITY", atMs: 300, playerId: "player-1" },
        { type: "FLIP_GRAVITY", atMs: 600, playerId: "player-1" }
      ] as const;

      stepSimulation(simulation, 1000, commands);
      reachCheckpoint(simulation, {
        id: "cp-1",
        x: 360,
        y: 90,
        atMs: 1000
      });
      completeLevel(simulation, 1250);

      return getSimulationResult(simulation);
    };

    expect(replay()).toEqual(replay());
  });

  it("is invariant to render-frame chunking", () => {
    const singleFrame = createRunningSimulation();
    const manyFrames = createRunningSimulation();
    const commands = [
      { type: "FLIP_GRAVITY", atMs: 400, playerId: "player-1" }
    ] as const;

    stepSimulation(singleFrame, 1000, commands);
    for (let frame = 0; frame < 10; frame += 1) {
      stepSimulation(manyFrames, 100, commands);
    }

    expect(getSimulationResult(manyFrames)).toEqual(
      getSimulationResult(singleFrame)
    );
  });
});

describe("commands and lifecycle events", () => {
  it("changes gravity once for each accepted, non-duplicate command", () => {
    const simulation = createRunningSimulation();
    const first = {
      type: "FLIP_GRAVITY",
      atMs: 300,
      playerId: "player-1"
    } as const;

    stepSimulation(simulation, 100, [first, first]);
    expect(simulation.state.player.gravityDirection).toBe(-1);

    stepSimulation(simulation, 100, [
      { type: "FLIP_GRAVITY", atMs: 350, playerId: "player-1" }
    ]);
    expect(simulation.state.player.gravityDirection).toBe(-1);

    stepSimulation(simulation, 100, [
      { type: "FLIP_GRAVITY", atMs: 450, playerId: "player-1" }
    ]);
    expect(simulation.state.player.gravityDirection).toBe(1);
    expect(
      simulation.events.filter((event) => event.type === "PLAYER_FLIPPED")
    ).toHaveLength(2);
  });

  it("respawns at the latest checkpoint after death", () => {
    const simulation = createRunningSimulation();
    reachCheckpoint(simulation, {
      id: "cp-1",
      x: 640,
      y: 80,
      atMs: 300
    });
    killPlayer(simulation, "hazard", 400);

    expect(simulation.state.phase).toBe("DEAD");
    expect(simulation.state.deaths).toBe(1);

    stepSimulation(simulation, simulation.fixedDeltaMs * 18);
    expect(simulation.state.phase).toBe("CHECKPOINT_RESPAWN");
    expect(simulation.state.player).toMatchObject({
      x: 640,
      y: 80,
      checkpointId: "cp-1",
      alive: true
    });

    stepSimulation(simulation, simulation.fixedDeltaMs);
    expect(simulation.state.phase).toBe("COUNTDOWN");
  });

  it("emits level completion at most once", () => {
    const simulation = createRunningSimulation();

    completeLevel(simulation, 900);
    completeLevel(simulation, 901);

    expect(simulation.state.phase).toBe("LEVEL_COMPLETE");
    expect(
      simulation.events.filter((event) => event.type === "LEVEL_COMPLETED")
    ).toHaveLength(1);
  });
});
