import {
  duplicateIdLevelFixture,
  invalidDimensionsLevelFixture,
  invalidSpawnLevelFixture,
  unorderedCheckpointsLevelFixture,
  unsupportedHazardLevelFixture,
  validLevelFixture
} from "@gravity-runner/test-fixtures";
import { describe, expect, it } from "vitest";

import {
  createLevelChecksumInput,
  parseLevelManifest,
  type LevelValidationErrorCode
} from "./index.js";

function errorCodes(source: unknown): LevelValidationErrorCode[] {
  const result = parseLevelManifest(source);
  expect(result.valid).toBe(false);
  return result.valid ? [] : result.errors.map((error) => error.code);
}

describe("level manifest parser", () => {
  it("parses valid object and JSON inputs", () => {
    const objectResult = parseLevelManifest(validLevelFixture);
    const jsonResult = parseLevelManifest(JSON.stringify(validLevelFixture));

    expect(objectResult.valid).toBe(true);
    expect(jsonResult).toEqual(objectResult);
  });

  it("returns a stable error for malformed JSON", () => {
    expect(errorCodes("{not-json")).toEqual(["LEVEL_JSON_INVALID"]);
  });

  it.each([
    [duplicateIdLevelFixture, "DUPLICATE_ID"],
    [invalidDimensionsLevelFixture, "INVALID_DIMENSIONS"],
    [invalidSpawnLevelFixture, "SPAWN_OUT_OF_BOUNDS"],
    [unorderedCheckpointsLevelFixture, "CHECKPOINTS_UNORDERED"],
    [unsupportedHazardLevelFixture, "UNSUPPORTED_HAZARD_TYPE"]
  ] as const)("rejects invalid fixture with %s", (fixture, expectedCode) => {
    expect(errorCodes(fixture)).toContain(expectedCode);
  });
});

describe("stable checksum input", () => {
  it("is independent from object key insertion order", () => {
    const reordered = {
      hazards: validLevelFixture.hazards,
      platforms: validLevelFixture.platforms,
      checkpoints: validLevelFixture.checkpoints,
      finish: validLevelFixture.finish,
      spawn: validLevelFixture.spawn,
      runSpeed: validLevelFixture.runSpeed,
      height: validLevelFixture.height,
      width: validLevelFixture.width,
      theme: validLevelFixture.theme,
      name: validLevelFixture.name,
      version: validLevelFixture.version,
      id: validLevelFixture.id
    };

    expect(createLevelChecksumInput(reordered)).toBe(
      createLevelChecksumInput(validLevelFixture)
    );
  });

  it("preserves gameplay-significant array order", () => {
    const reversed = {
      ...validLevelFixture,
      checkpoints: [...validLevelFixture.checkpoints].reverse()
    };

    expect(createLevelChecksumInput(reversed)).not.toBe(
      createLevelChecksumInput(validLevelFixture)
    );
  });
});
