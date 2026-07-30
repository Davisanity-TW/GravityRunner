import type { GameInput, InputCommandController } from "./inputController.js";

type KeyboardEventLike = {
  code: string;
  preventDefault(): void;
};

type PointerEventLike = {
  button: number;
};

type EventPort<TEvent> = {
  on(event: string, listener: (event: TEvent) => void): void;
  off(event: string, listener: (event: TEvent) => void): void;
};

export type PhaserInputPorts = {
  keyboard?: EventPort<KeyboardEventLike> | null;
  pointer: EventPort<PointerEventLike>;
};

export function bindPhaserInput(
  ports: PhaserInputPorts,
  controller: InputCommandController
): () => void {
  const onKeyboard = (event: KeyboardEventLike): void => {
    const input: GameInput = { source: "keyboard", code: event.code };
    if (controller.handle(input) !== null) {
      event.preventDefault();
    }
  };
  const onPointer = (event: PointerEventLike): void => {
    controller.handle({ source: "pointer", button: event.button });
  };

  ports.keyboard?.on("keydown", onKeyboard);
  ports.pointer.on("pointerdown", onPointer);

  return () => {
    ports.keyboard?.off("keydown", onKeyboard);
    ports.pointer.off("pointerdown", onPointer);
  };
}
