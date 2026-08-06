import { lazy, Suspense, useCallback, useEffect, useState } from "react";

import {
  defaultGameSettings,
  flipKeyLabels,
  loadGameSettings,
  saveGameSettings,
  type FlipKey,
  type GameSettings
} from "./settings.js";
import {
  completeStoryLevel,
  formatBestTime,
  getStoryLevelStatus,
  loadStoryProgress,
  saveStoryProgress,
  storyLevels,
  type StoryLevelId,
  type StoryProgress
} from "./progress.js";

const GameCanvas = lazy(async () => {
  const module = await import("../game/GameCanvas.js");
  return { default: module.GameCanvas };
});

type AppScreen = "menu" | "levels" | "practice" | "game";
type RunMode = "STORY" | "PRACTICE" | "ENDLESS";
const endlessBestScoreKey = "gravity-runner.endless-best-score.v1";

function loadEndlessBestScore(): number {
  if (typeof window === "undefined") return 0;
  const value = Number(window.localStorage.getItem(endlessBestScoreKey));
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

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

function StoryLevelSelect({
  progress,
  onSelect,
  onBack
}: {
  progress: StoryProgress;
  onSelect(levelId: StoryLevelId): void;
  onBack(): void;
}) {
  return (
    <section className="story-level-select" aria-labelledby="story-level-title">
      <div className="level-select-heading">
        <div>
          <p className="eyebrow">STORY / CAMPAIGN MAP</p>
          <h1 id="story-level-title">Choose a relay.</h1>
          <p className="lede">
            Complete each original route to unlock the next signal in the
            archive. Your best times stay on this device.
          </p>
        </div>
        <button className="text-button" type="button" onClick={onBack}>
          ← Return to mode select
        </button>
      </div>

      <div className="level-grid" role="region" aria-label="Story levels">
        {storyLevels.map((level) => {
          const status = getStoryLevelStatus(progress, level.id);
          const playable = status !== "locked" && level.runtimeAvailable;
          const statusLabel =
            status === "completed"
              ? "COMPLETED"
              : status === "available"
                ? level.runtimeAvailable
                  ? "AVAILABLE"
                  : "UNLOCKED · AUTHORING"
                : "LOCKED";
          return (
            <article
              className={`level-card level-card--${status}`}
              key={level.id}
            >
              <div className="mode-card__topline">
                <span>{level.code}</span>
                <span>{statusLabel}</span>
              </div>
              <h2>{level.title}</h2>
              <p className="level-card__subtitle">{level.subtitle}</p>
              <p>{level.description}</p>
              <dl className="level-card__meta">
                <div>
                  <dt>Status</dt>
                  <dd>{status}</dd>
                </div>
                <div>
                  <dt>Best time</dt>
                  <dd>{formatBestTime(progress.bestTimesMs[level.id])}</dd>
                </div>
              </dl>
              <button
                className={playable ? "play-button" : "locked-button"}
                type="button"
                disabled={!playable}
                onClick={() => onSelect(level.id)}
              >
                {playable
                  ? level.id === "signal-vault-01"
                    ? "Initialize run"
                    : "Start level"
                  : status === "locked"
                    ? "Complete previous level"
                    : "Content queued"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PracticeSelect({
  progress,
  onStart,
  onBack
}: {
  progress: StoryProgress;
  onStart(levelId: StoryLevelId, checkpointId: string | null): void;
  onBack(): void;
}) {
  const level = storyLevels[0]!;
  const unlocked = getStoryLevelStatus(progress, level.id) !== "locked";
  return (
    <section className="story-level-select" aria-labelledby="practice-title">
      <div className="level-select-heading">
        <div>
          <p className="eyebrow">PRACTICE / SECTION SELECT</p>
          <h1 id="practice-title">Rehearse a relay.</h1>
          <p className="lede">
            Start from the opening or jump directly to the unlocked checkpoint.
            Practice runs never change Story records.
          </p>
        </div>
        <button className="text-button" type="button" onClick={onBack}>
          ← Return to mode select
        </button>
      </div>
      <div className="level-grid" role="region" aria-label="Practice sections">
        <article className="level-card level-card--available">
          <div className="mode-card__topline">
            <span>{level.code}</span>
            <span>AVAILABLE</span>
          </div>
          <h2>{level.title}</h2>
          <p>{level.description}</p>
          <div className="overlay-actions">
            <button
              className="play-button"
              type="button"
              disabled={!unlocked}
              onClick={() => onStart(level.id, null)}
            >
              Start from opening
            </button>
            <button
              className="secondary-button"
              type="button"
              disabled={!unlocked}
              onClick={() => onStart(level.id, "relay-01")}
            >
              Start at relay checkpoint
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}

export function App() {
  const [screen, setScreen] = useState<AppScreen>("menu");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(loadGameSettings);
  const [progress, setProgress] = useState(loadStoryProgress);
  const [selectedLevelId, setSelectedLevelId] =
    useState<StoryLevelId>("signal-vault-01");
  const [runMode, setRunMode] = useState<RunMode>("STORY");
  const [startCheckpointId, setStartCheckpointId] = useState<string | null>(
    null
  );

  useEffect(() => {
    saveGameSettings(settings);
    document.documentElement.dataset.reducedEffects = String(
      settings.reducedEffects
    );
  }, [settings]);

  useEffect(() => {
    saveStoryProgress(progress);
  }, [progress]);

  const completeLevel = useCallback(
    (elapsedMs: number, deaths: number) => {
      if (runMode === "PRACTICE") {
        return;
      }
      if (runMode === "ENDLESS") {
        const score = Math.max(0, Math.floor(elapsedMs / 100) - deaths * 250);
        const best = Math.max(loadEndlessBestScore(), score);
        window.localStorage.setItem(endlessBestScoreKey, String(best));
        return;
      }
      setProgress((current) =>
        completeStoryLevel(current, selectedLevelId, elapsedMs)
      );
    },
    [runMode, selectedLevelId]
  );

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
                  <dd>
                    {formatBestTime(progress.bestTimesMs["signal-vault-01"])}
                  </dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    {getStoryLevelStatus(progress, "signal-vault-01") ===
                    "completed"
                      ? "Completed"
                      : "Unlocked"}
                  </dd>
                </div>
              </dl>
              <button
                className="play-button"
                type="button"
                onClick={() => {
                  setRunMode("STORY");
                  setStartCheckpointId(null);
                  setScreen("game");
                }}
              >
                <span>Initialize run</span>
                <span aria-hidden="true">→</span>
              </button>
              <button
                className="text-button mode-card__levels-link"
                type="button"
                onClick={() => setScreen("levels")}
              >
                View Story level select →
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
              <article
                className={`mode-card ${mode.name === "Practice" || mode.name === "Endless" ? "mode-card--available" : "mode-card--locked"}`}
                key={mode.name}
              >
                <div className="mode-card__topline">
                  <span>{mode.code}</span>
                  <span>PLANNED</span>
                </div>
                <h2>{mode.name}</h2>
                <p>{mode.copy}</p>
                {mode.name === "Endless" ? (
                  <p className="mode-card__topline">
                    BEST SCORE · {loadEndlessBestScore()}
                  </p>
                ) : null}
                {mode.name === "Practice" ? (
                  <button
                    type="button"
                    className="play-button"
                    onClick={() => {
                      setRunMode("PRACTICE");
                      setScreen("practice");
                    }}
                  >
                    Start practice
                  </button>
                ) : mode.name === "Endless" ? (
                  <button
                    type="button"
                    className="play-button"
                    onClick={() => {
                      setRunMode("ENDLESS");
                      setSelectedLevelId("signal-vault-01");
                      setStartCheckpointId(null);
                      setScreen("game");
                    }}
                  >
                    Start endless
                  </button>
                ) : (
                  <button type="button" className="locked-button" disabled>
                    Coming soon
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      ) : screen === "levels" ? (
        <StoryLevelSelect
          progress={progress}
          onBack={() => setScreen("menu")}
          onSelect={(levelId) => {
            setSelectedLevelId(levelId);
            setRunMode("STORY");
            setStartCheckpointId(null);
            setScreen("game");
          }}
        />
      ) : screen === "practice" ? (
        <PracticeSelect
          progress={progress}
          onBack={() => setScreen("menu")}
          onStart={(levelId, checkpointId) => {
            setSelectedLevelId(levelId);
            setRunMode("PRACTICE");
            setStartCheckpointId(checkpointId);
            setScreen("game");
          }}
        />
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
              onClick={() => setScreen("levels")}
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
              onExitToMenu={() => setScreen("levels")}
              onLevelComplete={completeLevel}
              levelId={selectedLevelId}
              mode={runMode}
              startCheckpointId={startCheckpointId}
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
