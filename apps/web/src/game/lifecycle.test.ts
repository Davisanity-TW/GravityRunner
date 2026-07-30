import { describe, expect, it, vi } from "vitest";

import { GameEventBridge } from "./bridge.js";
import {
  createRuntimeLifecycle,
  type RuntimeFactory,
  type RuntimeGameLike
} from "./runtimeLifecycle.js";

describe("Phaser lifecycle", () => {
  it("mounts at most one Phaser game per container", () => {
    const game = {
      destroy: vi.fn(),
      scale: { refresh: vi.fn() }
    } satisfies RuntimeGameLike;
    const factory = vi.fn(() => game) as RuntimeFactory<object>;
    const lifecycle = createRuntimeLifecycle({
      createConfig: () => ({}),
      factory,
      registerResize: () => vi.fn()
    });
    const container = {} as HTMLElement;
    const bridge = new GameEventBridge();

    const first = lifecycle.mount(container, bridge);
    const second = lifecycle.mount(container, bridge);

    expect(first).toBe(second);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("removes resize and bridge listeners and destroys the canvas once", () => {
    const game = {
      destroy: vi.fn(),
      scale: { refresh: vi.fn() }
    } satisfies RuntimeGameLike;
    const removeResize = vi.fn();
    const lifecycle = createRuntimeLifecycle({
      createConfig: () => ({}),
      factory: () => game,
      registerResize: (listener) => {
        listener();
        return removeResize;
      }
    });
    const bridge = new GameEventBridge();
    bridge.on("scene:changed", vi.fn());
    const runtime = lifecycle.mount({} as HTMLElement, bridge);

    runtime.dispose();
    runtime.dispose();

    expect(game.scale.refresh).toHaveBeenCalledOnce();
    expect(removeResize).toHaveBeenCalledOnce();
    expect(game.destroy).toHaveBeenCalledOnce();
    expect(game.destroy).toHaveBeenCalledWith(true);
    expect(bridge.listenerCount()).toBe(0);
  });
});
