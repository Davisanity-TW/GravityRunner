import { type Static, Type } from "@sinclair/typebox";

import { GravityDirectionSchema } from "./gameplay.js";

const IdentifierSchema = Type.String({ minLength: 1 });
const PositiveDimensionSchema = Type.Number({ exclusiveMinimum: 0 });

const RectangleSchema = Type.Object(
  {
    x: Type.Number(),
    y: Type.Number(),
    width: PositiveDimensionSchema,
    height: PositiveDimensionSchema
  },
  { additionalProperties: false }
);

const CheckpointSchema = Type.Object(
  {
    id: IdentifierSchema,
    x: Type.Number(),
    y: Type.Number(),
    gravityDirection: GravityDirectionSchema
  },
  { additionalProperties: false }
);

const PlatformSchema = Type.Object(
  {
    id: IdentifierSchema,
    x: Type.Number(),
    y: Type.Number(),
    width: PositiveDimensionSchema,
    height: PositiveDimensionSchema
  },
  { additionalProperties: false }
);

const HazardSchema = Type.Object(
  {
    id: IdentifierSchema,
    type: IdentifierSchema,
    x: Type.Number(),
    y: Type.Number(),
    width: PositiveDimensionSchema,
    height: PositiveDimensionSchema
  },
  { additionalProperties: false }
);

export const LevelManifestSchema = Type.Object(
  {
    id: IdentifierSchema,
    version: Type.Integer({ minimum: 1 }),
    name: IdentifierSchema,
    theme: IdentifierSchema,
    width: PositiveDimensionSchema,
    height: PositiveDimensionSchema,
    runSpeed: Type.Number({ exclusiveMinimum: 0 }),
    spawn: Type.Object(
      {
        x: Type.Number(),
        y: Type.Number(),
        gravityDirection: GravityDirectionSchema
      },
      { additionalProperties: false }
    ),
    finish: RectangleSchema,
    checkpoints: Type.Array(CheckpointSchema),
    platforms: Type.Array(PlatformSchema),
    hazards: Type.Array(HazardSchema)
  },
  { $id: "LevelManifest", additionalProperties: false }
);

export type LevelManifest = Static<typeof LevelManifestSchema>;
