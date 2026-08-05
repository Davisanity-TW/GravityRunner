import { describe, expect, it } from "vitest";

import {
  completeStoryLevel,
  defaultStoryProgress,
  getStoryLevelStatus,
  type StoryProgress
} from "./progress.js";

describe("story progression", () => {
  it("starts with only the first level available", () => {
    expect(getStoryLevelStatus(defaultStoryProgress, "signal-vault-01")).toBe(
      "available"
    );
    expect(getStoryLevelStatus(defaultStoryProgress, "signal-vault-02")).toBe(
      "locked"
    );
  });

  it("unlocks the next level and keeps the best time", () => {
    const completed = completeStoryLevel(
      defaultStoryProgress,
      "signal-vault-01",
      12_340
    );
    expect(getStoryLevelStatus(completed, "signal-vault-01")).toBe("completed");
    expect(getStoryLevelStatus(completed, "signal-vault-02")).toBe("available");
    expect(completed.bestTimesMs["signal-vault-01"]).toBe(12_340);

    const improved = completeStoryLevel(completed, "signal-vault-01", 9_800);
    expect(improved.bestTimesMs["signal-vault-01"]).toBe(9_800);
  });

  it("does not replace a best time with a slower retry", () => {
    const progress: StoryProgress = {
      ...defaultStoryProgress,
      unlocked: [...defaultStoryProgress.unlocked],
      bestTimesMs: { "signal-vault-01": 9_800 }
    };
    const retried = completeStoryLevel(progress, "signal-vault-01", 15_000);
    expect(retried.bestTimesMs["signal-vault-01"]).toBe(9_800);
  });
});
