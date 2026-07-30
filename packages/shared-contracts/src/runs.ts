import { type Static, Type } from "@sinclair/typebox";

import {
  GameCommandSchema,
  GameEventSchema,
  GameModeSchema
} from "./gameplay.js";

const IdentifierSchema = Type.String({ minLength: 1 });
const UuidSchema = Type.String({
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
});
const IsoUtcDateTimeSchema = Type.String({
  pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?Z$"
});

export const SubmitRunRequestSchema = Type.Object(
  {
    runId: UuidSchema,
    levelId: IdentifierSchema,
    levelVersion: Type.Integer({ minimum: 1 }),
    mode: GameModeSchema,
    clientVersion: IdentifierSchema,
    startedAt: IsoUtcDateTimeSchema,
    durationMs: Type.Integer({ minimum: 0 }),
    distance: Type.Number({ minimum: 0 }),
    checkpointIds: Type.Array(IdentifierSchema, { maxItems: 10_000 }),
    commands: Type.Array(GameCommandSchema, { maxItems: 100_000 }),
    events: Type.Array(GameEventSchema, { maxItems: 100_000 }),
    levelChecksum: IdentifierSchema
  },
  { $id: "SubmitRunRequest", additionalProperties: false }
);

export type SubmitRunRequest = Static<typeof SubmitRunRequestSchema>;

export const RunValidationStatusSchema = Type.Union([
  Type.Literal("pending"),
  Type.Literal("valid"),
  Type.Literal("invalid")
]);

export type RunValidationStatus = Static<typeof RunValidationStatusSchema>;

export const SubmitRunResponseSchema = Type.Object(
  {
    runId: UuidSchema,
    accepted: Type.Boolean(),
    validationStatus: RunValidationStatusSchema,
    rejectionReasons: Type.Array(Type.String({ minLength: 1 }))
  },
  { $id: "SubmitRunResponse", additionalProperties: false }
);

export type SubmitRunResponse = Static<typeof SubmitRunResponseSchema>;
