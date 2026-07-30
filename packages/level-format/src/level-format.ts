import {
  LevelManifestSchema,
  validateContract,
  type LevelManifest
} from "@gravity-runner/shared-contracts";

export const supportedHazardTypes = ["electric", "spikes", "void"] as const;

export type SupportedHazardType = (typeof supportedHazardTypes)[number];

export type LevelValidationErrorCode =
  | "LEVEL_JSON_INVALID"
  | "LEVEL_SCHEMA_INVALID"
  | "DUPLICATE_ID"
  | "INVALID_DIMENSIONS"
  | "SPAWN_OUT_OF_BOUNDS"
  | "SPAWN_INTERSECTS_PLATFORM"
  | "FINISH_OUT_OF_BOUNDS"
  | "CHECKPOINT_OUT_OF_BOUNDS"
  | "CHECKPOINTS_UNORDERED"
  | "GEOMETRY_OUT_OF_BOUNDS"
  | "UNSUPPORTED_HAZARD_TYPE";

export type LevelValidationError = {
  code: LevelValidationErrorCode;
  path: string;
  message: string;
};

export type LevelParseResult =
  | { valid: true; level: LevelManifest; errors: [] }
  | { valid: false; level: null; errors: LevelValidationError[] };

type Rectangle = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function pointInWorld(
  point: { x: number; y: number },
  world: { width: number; height: number }
): boolean {
  return (
    point.x >= 0 &&
    point.y >= 0 &&
    point.x <= world.width &&
    point.y <= world.height
  );
}

function rectangleInWorld(
  rectangle: Rectangle,
  world: { width: number; height: number }
): boolean {
  return (
    rectangle.x >= 0 &&
    rectangle.y >= 0 &&
    rectangle.x + rectangle.width <= world.width &&
    rectangle.y + rectangle.height <= world.height
  );
}

function pointIntersectsRectangle(
  point: { x: number; y: number },
  rectangle: Rectangle
): boolean {
  return (
    point.x > rectangle.x &&
    point.x < rectangle.x + rectangle.width &&
    point.y > rectangle.y &&
    point.y < rectangle.y + rectangle.height
  );
}

function validateUniqueIds(
  level: LevelManifest,
  errors: LevelValidationError[]
): void {
  const seen = new Map<string, string>();
  const objects = [
    ...level.checkpoints.map((item, index) => ({
      id: item.id,
      path: `/checkpoints/${index}/id`
    })),
    ...level.platforms.map((item, index) => ({
      id: item.id,
      path: `/platforms/${index}/id`
    })),
    ...level.hazards.map((item, index) => ({
      id: item.id,
      path: `/hazards/${index}/id`
    }))
  ];

  for (const object of objects) {
    const previousPath = seen.get(object.id);
    if (previousPath !== undefined) {
      errors.push({
        code: "DUPLICATE_ID",
        path: object.path,
        message: `ID "${object.id}" is already used at ${previousPath}`
      });
    } else {
      seen.set(object.id, object.path);
    }
  }
}

export function validateLevelManifest(
  level: LevelManifest
): LevelValidationError[] {
  const errors: LevelValidationError[] = [];
  validateUniqueIds(level, errors);

  if (!pointInWorld(level.spawn, level)) {
    errors.push({
      code: "SPAWN_OUT_OF_BOUNDS",
      path: "/spawn",
      message: "Spawn point must be inside the level bounds"
    });
  } else {
    const intersectingIndex = level.platforms.findIndex((platform) =>
      pointIntersectsRectangle(level.spawn, platform)
    );
    if (intersectingIndex >= 0) {
      errors.push({
        code: "SPAWN_INTERSECTS_PLATFORM",
        path: "/spawn",
        message: `Spawn point intersects platform at /platforms/${intersectingIndex}`
      });
    }
  }

  if (!rectangleInWorld(level.finish, level)) {
    errors.push({
      code: "FINISH_OUT_OF_BOUNDS",
      path: "/finish",
      message: "Finish trigger must be inside the level bounds"
    });
  }

  level.checkpoints.forEach((checkpoint, index) => {
    if (!pointInWorld(checkpoint, level)) {
      errors.push({
        code: "CHECKPOINT_OUT_OF_BOUNDS",
        path: `/checkpoints/${index}`,
        message: "Checkpoint must be inside the level bounds"
      });
    }
    if (index > 0 && checkpoint.x <= level.checkpoints[index - 1]!.x) {
      errors.push({
        code: "CHECKPOINTS_UNORDERED",
        path: `/checkpoints/${index}/x`,
        message: "Checkpoint x positions must be strictly increasing"
      });
    }
  });

  level.platforms.forEach((platform, index) => {
    if (!rectangleInWorld(platform, level)) {
      errors.push({
        code: "GEOMETRY_OUT_OF_BOUNDS",
        path: `/platforms/${index}`,
        message: "Platform geometry must be inside the level bounds"
      });
    }
  });

  const supportedHazards = new Set<string>(supportedHazardTypes);
  level.hazards.forEach((hazard, index) => {
    if (!supportedHazards.has(hazard.type)) {
      errors.push({
        code: "UNSUPPORTED_HAZARD_TYPE",
        path: `/hazards/${index}/type`,
        message: `Unsupported hazard type "${hazard.type}"`
      });
    }
    if (!rectangleInWorld(hazard, level)) {
      errors.push({
        code: "GEOMETRY_OUT_OF_BOUNDS",
        path: `/hazards/${index}`,
        message: "Hazard geometry must be inside the level bounds"
      });
    }
  });

  return errors;
}

function structuralErrorCode(path: string): LevelValidationErrorCode {
  return path.endsWith("/width") || path.endsWith("/height")
    ? "INVALID_DIMENSIONS"
    : "LEVEL_SCHEMA_INVALID";
}

export function parseLevelManifest(source: string | unknown): LevelParseResult {
  let value: unknown = source;

  if (typeof source === "string") {
    try {
      value = JSON.parse(source) as unknown;
    } catch {
      return {
        valid: false,
        level: null,
        errors: [
          {
            code: "LEVEL_JSON_INVALID",
            path: "",
            message: "Level source is not valid JSON"
          }
        ]
      };
    }
  }

  const structuralResult = validateContract(LevelManifestSchema, value);
  if (!structuralResult.valid) {
    return {
      valid: false,
      level: null,
      errors: structuralResult.errors.map((error) => ({
        code: structuralErrorCode(error.path),
        path: error.path,
        message: error.message
      }))
    };
  }

  const level = value as LevelManifest;
  const errors = validateLevelManifest(level);
  if (errors.length > 0) {
    return { valid: false, level: null, errors };
  }

  return { valid: true, level, errors: [] };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .filter((key) => record[key] !== undefined)
        .map((key) => [key, canonicalize(record[key])])
    );
  }
  return value;
}

export function createLevelChecksumInput(level: LevelManifest): string {
  return JSON.stringify(canonicalize(level));
}
