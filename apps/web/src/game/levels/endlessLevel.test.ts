import { describe, expect, it } from "vitest";

import { createEndlessLevel } from "./endlessLevel.js";

describe("endless authored route", () => {
  it("creates the current five-checkpoint batch deterministically", () => {
    const first = createEndlessLevel(1337, 5);
    const second = createEndlessLevel(1337, 5);
    expect(first.checkpoints).toHaveLength(5);
    expect(first).toEqual(second);
    expect(first.platforms).toHaveLength(5);
  });
});
