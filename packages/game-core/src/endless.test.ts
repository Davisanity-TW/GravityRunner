import { describe, expect, it } from "vitest";

import {
  createEndlessScheduler,
  getEndlessDifficulty
} from "./endless.js";

describe("endless chunk scheduler", () => {
  it("replays the same chunk sequence for the same seed", () => {
    const left = createEndlessScheduler(42);
    const right = createEndlessScheduler(42);
    const distances = [0, 960, 2_080, 3_360, 4_800];
    const leftIds = distances.map((distance) =>
      left.selectNext(distance, distance % 2 === 0 ? 1 : -1).id
    );
    const rightIds = distances.map((distance) =>
      right.selectNext(distance, distance % 2 === 0 ? 1 : -1).id
    );
    expect(leftIds).toEqual(rightIds);
  });

  it("only selects chunks compatible with the current surface", () => {
    const scheduler = createEndlessScheduler(7);
    expect(scheduler.selectNext(0, 1).entryGravity).toBe(1);
    expect(scheduler.selectNext(0, -1).entryGravity).toBe(-1);
  });

  it("raises difficulty at documented distance thresholds", () => {
    expect(getEndlessDifficulty(0)).toBe(0);
    expect(getEndlessDifficulty(4_000)).toBe(1);
    expect(getEndlessDifficulty(8_000)).toBe(2);
    expect(getEndlessDifficulty(12_000)).toBe(3);
  });
});
