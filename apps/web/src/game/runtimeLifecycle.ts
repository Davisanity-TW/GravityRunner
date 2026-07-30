import type { GameEventBridge } from "./bridge.js";

export type RuntimeGameLike = {
  destroy(removeCanvas: boolean): void;
  scale: {
    refresh(): void;
  };
};

export type RuntimeFactory<TConfig> = (config: TConfig) => RuntimeGameLike;
export type ResizeRegistrar = (listener: () => void) => () => void;

export type MountedRuntime = {
  readonly game: RuntimeGameLike;
  dispose(): void;
};

export function createRuntimeLifecycle<TConfig>(options: {
  createConfig(container: HTMLElement, bridge: GameEventBridge): TConfig;
  factory: RuntimeFactory<TConfig>;
  registerResize: ResizeRegistrar;
}) {
  const mounted = new WeakMap<HTMLElement, MountedRuntime>();

  return {
    mount(container: HTMLElement, bridge: GameEventBridge): MountedRuntime {
      const existing = mounted.get(container);
      if (existing !== undefined) {
        return existing;
      }

      const game = options.factory(options.createConfig(container, bridge));
      const removeResize = options.registerResize(() => game.scale.refresh());
      let disposed = false;

      const runtime: MountedRuntime = {
        game,
        dispose(): void {
          if (disposed) {
            return;
          }
          disposed = true;
          removeResize();
          bridge.clear();
          game.destroy(true);
          mounted.delete(container);
        }
      };

      mounted.set(container, runtime);
      return runtime;
    }
  };
}
