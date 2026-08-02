export type FlipKey = "Space" | "ArrowUp" | "KeyW";

export type GameSettings = {
  flipKey: FlipKey;
  musicVolume: number;
  effectsVolume: number;
  reducedEffects: boolean;
  debugOverlay: boolean;
};

export const defaultGameSettings: GameSettings = {
  flipKey: "Space",
  musicVolume: 70,
  effectsVolume: 85,
  reducedEffects: false,
  debugOverlay: false
};

export const flipKeyLabels: Record<FlipKey, string> = {
  Space: "Space",
  ArrowUp: "Arrow Up",
  KeyW: "W"
};

const storageKey = "gravity-runner.settings.v1";

function clampVolume(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : fallback;
}

function isFlipKey(value: unknown): value is FlipKey {
  return value === "Space" || value === "ArrowUp" || value === "KeyW";
}

export function loadGameSettings(): GameSettings {
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === null) {
      return defaultGameSettings;
    }

    const value = JSON.parse(stored) as Partial<GameSettings>;
    return {
      flipKey: isFlipKey(value.flipKey)
        ? value.flipKey
        : defaultGameSettings.flipKey,
      musicVolume: clampVolume(
        value.musicVolume,
        defaultGameSettings.musicVolume
      ),
      effectsVolume: clampVolume(
        value.effectsVolume,
        defaultGameSettings.effectsVolume
      ),
      reducedEffects:
        typeof value.reducedEffects === "boolean"
          ? value.reducedEffects
          : defaultGameSettings.reducedEffects,
      debugOverlay:
        typeof value.debugOverlay === "boolean"
          ? value.debugOverlay
          : defaultGameSettings.debugOverlay
    };
  } catch {
    return defaultGameSettings;
  }
}

export function saveGameSettings(settings: GameSettings): void {
  window.localStorage.setItem(storageKey, JSON.stringify(settings));
}
