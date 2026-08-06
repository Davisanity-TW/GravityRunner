import { type Static, Type } from "@sinclair/typebox";

const IdentifierSchema = Type.String({ minLength: 1 });
const NonNegativeIntegerSchema = Type.Integer({ minimum: 0 });

export const GravityDirectionSchema = Type.Union(
  [Type.Literal(1), Type.Literal(-1)],
  { $id: "GravityDirection" }
);

export type GravityDirection = Static<typeof GravityDirectionSchema>;

export const GameModeSchema = Type.Union(
  [Type.Literal("STORY"), Type.Literal("PRACTICE"), Type.Literal("ENDLESS")],
  { $id: "GameMode" }
);

export type GameMode = Static<typeof GameModeSchema>;

export const GamePhaseSchema = Type.Union(
  [
    Type.Literal("BOOT"),
    Type.Literal("MENU"),
    Type.Literal("COUNTDOWN"),
    Type.Literal("RUNNING"),
    Type.Literal("PAUSED"),
    Type.Literal("DEAD"),
    Type.Literal("CHECKPOINT_RESPAWN"),
    Type.Literal("LEVEL_COMPLETE"),
    Type.Literal("RESULT")
  ],
  { $id: "GamePhase" }
);

export type GamePhase = Static<typeof GamePhaseSchema>;

export const GameCommandSchema = Type.Object(
  {
    type: Type.Literal("FLIP_GRAVITY"),
    atMs: NonNegativeIntegerSchema,
    playerId: IdentifierSchema
  },
  { $id: "GameCommand", additionalProperties: false }
);

export type GameCommand = Static<typeof GameCommandSchema>;

const PlayerFlippedEventSchema = Type.Object(
  {
    type: Type.Literal("PLAYER_FLIPPED"),
    atMs: NonNegativeIntegerSchema,
    playerId: IdentifierSchema
  },
  { additionalProperties: false }
);

const CheckpointReachedEventSchema = Type.Object(
  {
    type: Type.Literal("CHECKPOINT_REACHED"),
    atMs: NonNegativeIntegerSchema,
    checkpointId: IdentifierSchema
  },
  { additionalProperties: false }
);

const PlayerDiedEventSchema = Type.Object(
  {
    type: Type.Literal("PLAYER_DIED"),
    atMs: NonNegativeIntegerSchema,
    cause: IdentifierSchema
  },
  { additionalProperties: false }
);

const LevelCompletedEventSchema = Type.Object(
  {
    type: Type.Literal("LEVEL_COMPLETED"),
    atMs: NonNegativeIntegerSchema,
    durationMs: NonNegativeIntegerSchema
  },
  { additionalProperties: false }
);

export const GameEventSchema = Type.Union(
  [
    PlayerFlippedEventSchema,
    CheckpointReachedEventSchema,
    PlayerDiedEventSchema,
    LevelCompletedEventSchema
  ],
  { $id: "GameEvent" }
);

export type GameEvent = Static<typeof GameEventSchema>;

export const PlayerStateSchema = Type.Object(
  {
    x: Type.Number(),
    y: Type.Number(),
    vx: Type.Number(),
    vy: Type.Number(),
    gravityDirection: GravityDirectionSchema,
    isGrounded: Type.Boolean(),
    alive: Type.Boolean(),
    checkpointId: Type.Union([IdentifierSchema, Type.Null()])
  },
  { $id: "PlayerState", additionalProperties: false }
);

export type PlayerState = Static<typeof PlayerStateSchema>;

export const GameStateSchema = Type.Object(
  {
    phase: GamePhaseSchema,
    levelId: IdentifierSchema,
    levelVersion: Type.Integer({ minimum: 1 }),
    elapsedMs: NonNegativeIntegerSchema,
    deaths: NonNegativeIntegerSchema,
    player: PlayerStateSchema
  },
  { $id: "GameState", additionalProperties: false }
);

export type GameState = Static<typeof GameStateSchema>;

export const GameTuningConfigSchema = Type.Object(
  {
    tickRateHz: Type.Integer({ minimum: 1, maximum: 240 }),
    runSpeed: Type.Number({ exclusiveMinimum: 0 }),
    playerAccelerationIntervalMs: Type.Optional(Type.Integer({ minimum: 1 })),
    playerAccelerationStep: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
    playerMaxSpeed: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
    gravityAcceleration: Type.Number({ exclusiveMinimum: 0 }),
    maxVerticalSpeed: Type.Number({ exclusiveMinimum: 0 }),
    flipVelocityDamping: Type.Number({ minimum: 0, maximum: 1 }),
    flipCooldownMs: NonNegativeIntegerSchema,
    respawnDelayMs: NonNegativeIntegerSchema,
    countdownMs: NonNegativeIntegerSchema
  },
  { $id: "GameTuningConfig", additionalProperties: false }
);

export type GameTuningConfig = Static<typeof GameTuningConfigSchema>;
