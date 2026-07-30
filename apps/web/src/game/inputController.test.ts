import type { GameCommand } from "@gravity-runner/shared-contracts";
import { describe, expect, it, vi } from "vitest";

import { bindPhaserInput } from "./inputAdapter.js";
import {
  createInputCommandController,
  defaultInputBindings
} from "./inputController.js";

function createController(options?: {
  clockMs?: number;
  enabled?: boolean;
  cooldownMs?: number;
}) {
  let clockMs = options?.clockMs ?? 500;
  let enabled = options?.enabled ?? true;
  const commands: GameCommand[] = [];
  const controller = createInputCommandController({
    bindings: defaultInputBindings,
    cooldownMs: options?.cooldownMs ?? 100,
    getClockMs: () => clockMs,
    isEnabled: () => enabled,
    dispatch: (command) => commands.push(command)
  });

  return {
    commands,
    controller,
    setClockMs(value: number) {
      clockMs = value;
    },
    setEnabled(value: boolean) {
      enabled = value;
    }
  };
}

describe("input command controller", () => {
  it.each([
    [{ source: "keyboard", code: "Space" } as const],
    [{ source: "pointer", button: 0 } as const]
  ])("maps %o to one domain command", (input) => {
    const harness = createController();

    expect(harness.controller.handle(input)).toEqual({
      type: "FLIP_GRAVITY",
      atMs: 500,
      playerId: "player-1"
    });
    expect(harness.commands).toHaveLength(1);
  });

  it("uses the simulation clock and enforces cooldown across input sources", () => {
    const harness = createController({ clockMs: 701.9, cooldownMs: 100 });

    harness.controller.handle({ source: "keyboard", code: "Space" });
    harness.setClockMs(750);
    harness.controller.handle({ source: "pointer", button: 0 });
    harness.setClockMs(801);
    harness.controller.handle({ source: "pointer", button: 0 });

    expect(harness.commands.map(({ atMs }) => atMs)).toEqual([701, 801]);
  });

  it("ignores input while disabled or when no binding exists", () => {
    const harness = createController({ enabled: false });

    harness.controller.handle({ source: "keyboard", code: "Space" });
    harness.setEnabled(true);
    harness.controller.handle({ source: "keyboard", code: "Enter" });

    expect(harness.commands).toEqual([]);
  });
});

describe("Phaser input adapter", () => {
  it("registers one keyboard and one pointer path and cleans both up", () => {
    const keyboardListeners = new Map<string, (event: never) => void>();
    const pointerListeners = new Map<string, (event: never) => void>();
    const keyboard = {
      on: vi.fn((event: string, listener: (event: never) => void) => {
        keyboardListeners.set(event, listener);
      }),
      off: vi.fn()
    };
    const pointer = {
      on: vi.fn((event: string, listener: (event: never) => void) => {
        pointerListeners.set(event, listener);
      }),
      off: vi.fn()
    };
    const handle = vi.fn(() => null);

    const dispose = bindPhaserInput(
      { keyboard, pointer },
      { handle, reset: vi.fn() }
    );
    dispose();

    expect(keyboard.on).toHaveBeenCalledOnce();
    expect(pointer.on).toHaveBeenCalledOnce();
    expect(keyboard.off).toHaveBeenCalledWith(
      "keydown",
      keyboardListeners.get("keydown")
    );
    expect(pointer.off).toHaveBeenCalledWith(
      "pointerdown",
      pointerListeners.get("pointerdown")
    );
  });
});
