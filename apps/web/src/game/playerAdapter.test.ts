import { describe, expect, it, vi } from "vitest";

import { syncPlayerBody } from "./playerAdapter.js";

describe("player adapter", () => {
  it("copies domain position, velocity, gravity and life state to Phaser", () => {
    const body = {
      setActive: vi.fn(),
      setAlpha: vi.fn(),
      setFlipY: vi.fn(),
      setPosition: vi.fn(),
      setVelocity: vi.fn(),
      setVisible: vi.fn()
    };

    syncPlayerBody(body, {
      x: 320,
      y: 180,
      vx: 240,
      vy: -90,
      gravityDirection: -1,
      isGrounded: false,
      alive: true,
      checkpointId: null
    });

    expect(body.setPosition).toHaveBeenCalledWith(320, 180);
    expect(body.setVelocity).toHaveBeenCalledWith(240, -90);
    expect(body.setFlipY).toHaveBeenCalledWith(true);
    expect(body.setAlpha).toHaveBeenCalledWith(1);
    expect(body.setActive).toHaveBeenCalledWith(true);
    expect(body.setVisible).toHaveBeenCalledWith(true);
  });
});
