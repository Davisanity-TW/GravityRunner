import Phaser from "phaser";

import type { GameEventBridge } from "./bridge.js";
import { BootScene } from "./scenes/BootScene.js";
import { GameScene } from "./scenes/GameScene.js";
import { HudScene } from "./scenes/HudScene.js";
import { PreloadScene } from "./scenes/PreloadScene.js";
import {
  createRuntimeLifecycle,
  type ResizeRegistrar,
  type RuntimeFactory,
  type RuntimeGameLike
} from "./runtimeLifecycle.js";

export type PhaserGameLike = RuntimeGameLike;
export type PhaserGameFactory = RuntimeFactory<Phaser.Types.Core.GameConfig>;

function registerWindowResize(listener: () => void): () => void {
  window.addEventListener("resize", listener, { passive: true });
  return () => window.removeEventListener("resize", listener);
}

function createGameConfig(
  container: HTMLElement,
  bridge: GameEventBridge
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: container,
    width: 1280,
    height: 720,
    backgroundColor: "#06101e",
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false
      }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 1280,
      height: 720
    },
    scene: [
      new BootScene(bridge),
      new PreloadScene(bridge),
      new GameScene(bridge),
      new HudScene(bridge)
    ]
  };
}

export function createPhaserLifecycle(options?: {
  factory?: PhaserGameFactory;
  registerResize?: ResizeRegistrar;
}) {
  const factory =
    options?.factory ??
    ((config: Phaser.Types.Core.GameConfig) => new Phaser.Game(config));
  return createRuntimeLifecycle({
    createConfig: createGameConfig,
    factory,
    registerResize: options?.registerResize ?? registerWindowResize
  });
}

export const phaserLifecycle = createPhaserLifecycle();
