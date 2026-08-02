import { describe, expect, it } from "vitest";

import {
  GameCommandSchema,
  GameStateSchema,
  GameTuningConfigSchema,
  LevelManifestSchema,
  SubmitRunRequestSchema,
  SubmitRunResponseSchema,
  validateContract
} from "./index.js";

const playerState = {
  x: 24,
  y: 360,
  vx: 240,
  vy: 0,
  gravityDirection: 1,
  isGrounded: true,
  alive: true,
  checkpointId: null
} as const;

const levelManifest = {
  id: "signal-vault",
  version: 2,
  name: "Signal Vault",
  theme: "neon-archive",
  width: 2400,
  height: 720,
  runSpeed: 240,
  spawn: { x: 120, y: 600, gravityDirection: 1 },
  finish: { x: 2290, y: 80, width: 40, height: 560 },
  checkpoints: [{ id: "cp-1", x: 1120, y: 600, gravityDirection: 1 }],
  platforms: [
    { id: "floor-1", x: 0, y: 650, width: 900, height: 70 },
    { id: "ceiling-1", x: 900, y: 0, width: 900, height: 70 }
  ],
  hazards: [
    {
      id: "spark-1",
      type: "electric",
      x: 720,
      y: 610,
      width: 40,
      height: 40
    }
  ]
} as const;

const submitRun = {
  runId: "88c11b06-3342-4ab2-a635-9bb54be7a2f0",
  levelId: "signal-vault",
  levelVersion: 1,
  mode: "STORY",
  clientVersion: "0.1.0",
  startedAt: "2026-07-30T13:00:00.000Z",
  durationMs: 24_000,
  distance: 2170,
  checkpointIds: ["cp-1"],
  commands: [{ type: "FLIP_GRAVITY", atMs: 1_200, playerId: "player-1" }],
  events: [
    { type: "PLAYER_FLIPPED", atMs: 1_200, playerId: "player-1" },
    { type: "CHECKPOINT_REACHED", atMs: 12_000, checkpointId: "cp-1" },
    {
      type: "LEVEL_COMPLETED",
      atMs: 24_000,
      durationMs: 24_000
    }
  ],
  levelChecksum: "sha256:original-level-checksum"
} as const;

describe("gameplay contracts", () => {
  it("accepts valid commands, state and tuning", () => {
    expect(
      validateContract(GameCommandSchema, {
        type: "FLIP_GRAVITY",
        atMs: 1200,
        playerId: "player-1"
      }).valid
    ).toBe(true);

    expect(
      validateContract(GameStateSchema, {
        phase: "RUNNING",
        levelId: "signal-vault",
        levelVersion: 1,
        elapsedMs: 1200,
        deaths: 0,
        player: playerState
      }).valid
    ).toBe(true);

    expect(
      validateContract(GameTuningConfigSchema, {
        tickRateHz: 60,
        runSpeed: 240,
        gravityAcceleration: 1200,
        maxVerticalSpeed: 720,
        flipVelocityDamping: 0.2,
        flipCooldownMs: 80,
        respawnDelayMs: 500,
        countdownMs: 1500
      }).valid
    ).toBe(true);
  });

  it("rejects invalid command and tuning values", () => {
    const commandResult = validateContract(GameCommandSchema, {
      type: "JUMP",
      atMs: -1,
      playerId: ""
    });
    const tuningResult = validateContract(GameTuningConfigSchema, {
      tickRateHz: 0,
      runSpeed: -1,
      gravityAcceleration: 1200,
      maxVerticalSpeed: 720,
      flipVelocityDamping: 2,
      flipCooldownMs: 80,
      respawnDelayMs: 500,
      countdownMs: 1500
    });

    expect(commandResult.valid).toBe(false);
    expect(tuningResult.valid).toBe(false);
  });
});

describe("level contract", () => {
  it("accepts a structurally valid original level manifest", () => {
    expect(validateContract(LevelManifestSchema, levelManifest).valid).toBe(
      true
    );
  });

  it("rejects non-positive collision dimensions", () => {
    const invalidLevel = {
      ...levelManifest,
      platforms: [
        { ...levelManifest.platforms[0], width: 0 },
        ...levelManifest.platforms.slice(1)
      ]
    };

    const result = validateContract(LevelManifestSchema, invalidLevel);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((error) => error.path.includes("width"))).toBe(
        true
      );
    }
  });
});

describe("run contracts", () => {
  it("accepts a valid run request and response", () => {
    expect(validateContract(SubmitRunRequestSchema, submitRun).valid).toBe(
      true
    );
    expect(
      validateContract(SubmitRunResponseSchema, {
        runId: submitRun.runId,
        accepted: true,
        validationStatus: "pending",
        rejectionReasons: []
      }).valid
    ).toBe(true);
  });

  it("rejects malformed identifiers, timestamps and negative metrics", () => {
    const result = validateContract(SubmitRunRequestSchema, {
      ...submitRun,
      runId: "not-a-uuid",
      startedAt: "today",
      durationMs: -1,
      distance: -50
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    }
  });
});
