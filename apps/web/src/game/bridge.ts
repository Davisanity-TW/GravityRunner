export type GameBridgeEventMap = {
  "ui:pause": Record<string, never>;
  "ui:resume": Record<string, never>;
  "ui:restart": Record<string, never>;
  "settings:changed": {
    flipKey: string;
    reducedEffects: boolean;
    debugOverlay: boolean;
    musicVolume: number;
    effectsVolume: number;
  };
  "scene:changed": {
    scene: "BOOT" | "PRELOAD" | "GAME" | "HUD";
  };
  "runtime:ready": {
    scene: "GAME";
    width: number;
    height: number;
  };
  "hud:status": {
    label: string;
    value: string;
  };
  "player:state": {
    gravity: "DOWN" | "UP";
    commandCount: number;
    x: number;
    y: number;
  };
  "run:telemetry": {
    phase:
      | "COUNTDOWN"
      | "RUNNING"
      | "PAUSED"
      | "DEAD"
      | "CHECKPOINT_RESPAWN"
      | "LEVEL_COMPLETE"
      | "RESULT";
    deaths: number;
    checkpointId: string | null;
    elapsedMs: number;
    tick: number;
    fps: number;
    canFlip: boolean;
    x: number;
    cameraX: number;
  };
};

type EventName = keyof GameBridgeEventMap;
type EventListener<K extends EventName> = (
  payload: GameBridgeEventMap[K]
) => void;
type StoredListener = (payload: GameBridgeEventMap[EventName]) => void;

export class GameEventBridge {
  private readonly listeners = new Map<EventName, Set<StoredListener>>();

  on<K extends EventName>(event: K, listener: EventListener<K>): () => void {
    const listeners = this.listeners.get(event) ?? new Set<StoredListener>();
    listeners.add(listener as StoredListener);
    this.listeners.set(event, listeners);

    return () => {
      listeners.delete(listener as StoredListener);
      if (listeners.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  emit<K extends EventName>(event: K, payload: GameBridgeEventMap[K]): void {
    const listeners = this.listeners.get(event);
    if (listeners === undefined) {
      return;
    }

    for (const listener of listeners) {
      listener(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }

  listenerCount(): number {
    let count = 0;
    for (const listeners of this.listeners.values()) {
      count += listeners.size;
    }
    return count;
  }
}
