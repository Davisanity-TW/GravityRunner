import { lazy, Suspense, useEffect, useState } from "react";

import {
  defaultGameSettings,
  flipKeyLabels,
  loadGameSettings,
  saveGameSettings,
  type FlipKey,
  type GameSettings
} from "./settings.js";

const GameCanvas = lazy(async () => {
  const module = await import("../game/GameCanvas.js");
  return { default: module.GameCanvas };
});

type AppScreen = "menu" | "game";

type SettingsPanelProps = {
  settings: GameSettings;
  onChange(settings: GameSettings): void;
  onClose(): void;
};

function SettingsPanel({ settings, onChange, onClose }: SettingsPanelProps) {
  const update = <K extends keyof GameSettings>(
    property: K,
    value: GameSettings[K]
  ) => onChange({ ...settings, [property]: value });

  return (
    <div className="modal-backdrop">
      <section
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="panel-heading">
          <div>
            <p className="eyebrow">PLAYER CONFIGURATION</p>
            <h2 id="settings-title">Settings</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close settings"
          >
            Close
          </button>
        </div>

        <label className="field-row">
          <span>
            <strong>Flip key</strong>
            <small>Pointer and touch remain enabled.</small>
          </span>
          <select
            value={settings.flipKey}
            onChange={(event) =>
              update("flipKey", event.target.value as FlipKey)
            }
          >
            {Object.entries(flipKeyLabels).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="field-row field-row--range">
          <span>
            <strong>Music volume</strong>
            <small>Music bus · {settings.musicVolume}%</small>
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.musicVolume}
            onChange={(event) =>
              update("musicVolume", Number(event.target.value))
            }
          />
        </label>

        <label className="field-row field-row--range">
          <span>
            <strong>Effects volume</strong>
            <small>Gameplay effects bus · {settings.effectsVolume}%</small>
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.effectsVolume}
            onChange={(event) =>
              update("effectsVolume", Number(event.target.value))
            }
          />
        </label>

        <label className="toggle-row">
          <span>
            <strong>Reduce movement and flash</strong>
            <small>
              Removes animated message movement and future camera shake.
            </small>
          </span>
          <input
            type="checkbox"
            checked={settings.reducedEffects}
            onChange={(event) => update("reducedEffects", event.target.checked)}
          />
        </label>

        <label className="toggle-row">
          <span>
            <strong>Debug telemetry</strong>
            <small>Shows physics body, tick, FPS and world coordinates.</small>
          </span>
          <input
            type="checkbox"
            checked={settings.debugOverlay}
            onChange={(event) => update("debugOverlay", event.target.checked)}
          />
        </label>

        <div className="settings-actions">
          <button
            className="text-button"
            type="button"
            onClick={() => onChange(defaultGameSettings)}
          >
            Restore defaults
          </button>
          <button className="play-button" type="button" onClick={onClose}>
            Save settings
          </button>
        </div>
      </section>
    </div>
  );
}

export function App() {
  const [screen, setScreen] = useState<AppScreen>("menu");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(loadGameSettings);

  useEffect(() => {
    saveGameSettings(settings);
    document.documentElement.dataset.reducedEffects = String(
      settings.reducedEffects
    );
  }, [settings]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <button
          className="brand brand-button"
          type="button"
          aria-label="Gravity Switch Runner home"
          onClick={() => setScreen("menu")}
        >
          <span className="brand-mark" aria-hidden="true">
            G
          </span>
          <span>
            <strong>Gravity Switch Runner</strong>
            <small>Original prototype</small>
          </span>
        </button>
        <div className="topbar-actions">
          <button
            className="text-button"
            type="button"
            onClick={() => setSettingsOpen(true)}
          >
            Settings
          </button>
          <span className="build-chip">PHASE 2 · EXPERIENCE SHELL</span>
        </div>
      </header>

      {screen === "menu" ? (
        <section className="mode-select" aria-labelledby="mission-title">
          <div className="hero-copy">
            <p className="eyebrow">SELECT RUN PROTOCOL</p>
            <h1 id="mission-title">
              Run the floor.
              <span>Rewrite gravity.</span>
            </h1>
            <p className="lede">
              One command. Two surfaces. Choose a protocol and enter the Signal
              Vault.
            </p>
            <span className="control-hint">
              {flipKeyLabels[settings.flipKey].toUpperCase()} / CLICK / TOUCH ·
              FLIP
            </span>
          </div>

          <div className="mode-grid" aria-label="Game modes">
            <article className="mode-card mode-card--available">
              <div className="mode-card__topline">
                <span>STORY</span>
                <span className="live-dot">AVAILABLE</span>
              </div>
              <h2>Signal Vault</h2>
              <p>
                A handcrafted relay run with one checkpoint, original hazards
                and a final extraction gate.
              </p>
              <dl className="mode-meta">
                <div>
                  <dt>Level</dt>
                  <dd>SV-01</dd>
                </div>
                <div>
                  <dt>Best</dt>
                  <dd>—</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>Unlocked</dd>
                </div>
              </dl>
              <button
                className="play-button"
                type="button"
                onClick={() => setScreen("game")}
              >
                <span>Initialize run</span>
                <span aria-hidden="true">→</span>
              </button>
            </article>

            {[
              {
                name: "Practice",
                code: "TRAINING",
                copy: "Restart sections instantly and rehearse difficult relays."
              },
              {
                name: "Endless",
                code: "SURVIVAL",
                copy: "Seeded track sequences, lives, score and local best."
              },
              {
                name: "Local Multiplayer",
                code: "VERSUS",
                copy: "Two to four runners sharing one clock and camera."
              }
            ].map((mode) => (
              <article className="mode-card mode-card--locked" key={mode.name}>
                <div className="mode-card__topline">
                  <span>{mode.code}</span>
                  <span>PLANNED</span>
                </div>
                <h2>{mode.name}</h2>
                <p>{mode.copy}</p>
                <button type="button" className="locked-button" disabled>
                  Coming soon
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="runtime-screen" aria-label="Game runtime">
          <div className="runtime-toolbar">
            <div>
              <p className="eyebrow">STORY / SIGNAL VAULT</p>
              <h1>Relay Run</h1>
            </div>
            <button
              className="text-button"
              type="button"
              onClick={() => setScreen("menu")}
            >
              ← Return to mission control
            </button>
          </div>
          <Suspense
            fallback={
              <div className="runtime-loading" role="status">
                Loading Phaser runtime…
              </div>
            }
          >
            <GameCanvas
              settings={settings}
              onOpenSettings={() => setSettingsOpen(true)}
              onExitToMenu={() => setScreen("menu")}
            />
          </Suspense>
        </section>
      )}

      <footer className="footer">
        <span>GRAVITY SYSTEMS / TAIPEI</span>
        <span>BUILD 0.2.0-EXPERIENCE</span>
      </footer>

      {settingsOpen ? (
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
    </main>
  );
}
