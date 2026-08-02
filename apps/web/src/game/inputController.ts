import type { GameCommand } from "@gravity-runner/shared-contracts";

export type GameInput =
  | {
      source: "keyboard";
      code: string;
    }
  | {
      source: "pointer";
      button: number;
    };

export type InputBinding =
  | {
      source: "keyboard";
      code: string;
      playerId: string;
    }
  | {
      source: "pointer";
      button: number;
      playerId: string;
    };

export type InputBindingMap = readonly InputBinding[];

export const defaultInputBindings = [
  { source: "keyboard", code: "Space", playerId: "player-1" },
  { source: "pointer", button: 0, playerId: "player-1" }
] as const satisfies InputBindingMap;

export type InputCommandController = {
  handle(input: GameInput): GameCommand | null;
  reset(): void;
};

function resolvePlayerId(
  bindings: InputBindingMap,
  input: GameInput
): string | null {
  for (const binding of bindings) {
    if (
      binding.source === "keyboard" &&
      input.source === "keyboard" &&
      binding.code === input.code
    ) {
      return binding.playerId;
    }

    if (
      binding.source === "pointer" &&
      input.source === "pointer" &&
      binding.button === input.button
    ) {
      return binding.playerId;
    }
  }

  return null;
}

export function createInputCommandController(options: {
  bindings: InputBindingMap | (() => InputBindingMap);
  cooldownMs: number;
  getClockMs(): number;
  isEnabled(): boolean;
  dispatch(command: GameCommand): void;
}): InputCommandController {
  const lastCommandAtMs = new Map<string, number>();

  return {
    handle(input): GameCommand | null {
      const bindings =
        typeof options.bindings === "function"
          ? options.bindings()
          : options.bindings;
      const playerId = resolvePlayerId(bindings, input);
      if (playerId === null || !options.isEnabled()) {
        return null;
      }

      const atMs = Math.max(0, Math.floor(options.getClockMs()));
      const previousAtMs = lastCommandAtMs.get(playerId);
      if (
        previousAtMs !== undefined &&
        atMs - previousAtMs < options.cooldownMs
      ) {
        return null;
      }

      const command = {
        type: "FLIP_GRAVITY",
        atMs,
        playerId
      } as const satisfies GameCommand;

      lastCommandAtMs.set(playerId, atMs);
      options.dispatch(command);
      return command;
    },
    reset(): void {
      lastCommandAtMs.clear();
    }
  };
}
