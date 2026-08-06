import { useEffect, useMemo, useRef, useState } from "react";

import type { GameSettings } from "../app/settings.js";
import { flipKeyLabels } from "../app/settings.js";
import type { StoryLevelId } from "../app/progress.js";
import { GameEventBridge } from "./bridge.js";
import { phaserLifecycle } from "./lifecycle.js";

type GameCanvasProps = {
  settings: GameSettings;
  onOpenSettings(): void;
  onExitToMenu(): void;
  onLevelComplete(elapsedMs: number): void;
  levelId: StoryLevelId;
  mode: "STORY" | "PRACTICE";
  startCheckpointId?: string | null;
};

function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((elapsedMs % 1000) / 10);
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
}

export function GameCanvas({
  settings,
  onOpenSettings,
  onExitToMenu,
  onLevelComplete,
  levelId,
  mode,
  startCheckpointId = null
}: GameCanvasProps) {
  const exposeDebugState = (
    import.meta as ImportMeta & { env: { DEV: boolean } }
  ).env.DEV;
  const containerRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef(settings);
  const completionReported = useRef(false);
  const bridge = useMemo(() => new GameEventBridge(), []);
  const [runtimeStatus, setRuntimeStatus] = useState("Starting runtime…");
  const [activeScene, setActiveScene] = useState("BOOT");
  const [gravity, setGravity] = useState<"DOWN" | "UP">("DOWN");
  const [runState, setRunState] = useState({
    phase: "COUNTDOWN",
    deaths: 0,
    checkpointId: null as string | null,
    elapsedMs: 0,
    canFlip: false,
    x: 0,
    cameraX: 0
  });

  useEffect(() => {
    settingsRef.current = settings;
    bridge.emit("settings:changed", settings);
  }, [bridge, settings]);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }

    const offScene = bridge.on("scene:changed", ({ scene }) => {
      setActiveScene(scene);
    });
    const offReady = bridge.on("runtime:ready", ({ width, height }) => {
      setRuntimeStatus(`Runtime ready · ${width}×${height}`);
      bridge.emit("settings:changed", settingsRef.current);
    });
    const offPlayerState = bridge.on("player:state", (state) => {
      setGravity(state.gravity);
    });
    const offTelemetry = bridge.on("run:telemetry", (state) => {
      setRunState(state);
      if (state.phase === "LEVEL_COMPLETE" && !completionReported.current) {
        completionReported.current = true;
        onLevelComplete(state.elapsedMs);
      }
    });
    bridge.selectedLevelId = levelId;
    bridge.selectedMode = mode;
    bridge.selectedStartCheckpointId = startCheckpointId;
    const runtime = phaserLifecycle.mount(container, bridge);

    return () => {
      offTelemetry();
      offPlayerState();
      offReady();
      offScene();
      runtime.dispose();
    };
  }, [bridge, levelId, mode, onLevelComplete, startCheckpointId]);

  const pause = () => bridge.emit("ui:pause", {});
  const resume = () => bridge.emit("ui:resume", {});
  const openSettings = () => {
    pause();
    onOpenSettings();
  };
  const restart = () => bridge.emit("ui:restart", {});

  return (
    <div className="game-frame">
      <div className="run-hud" aria-label="Run HUD">
        <div className="run-hud__metric">
          <span>TIME</span>
          <strong>{formatElapsed(runState.elapsedMs)}</strong>
        </div>
        <div className="run-hud__metric">
          <span>CHECKPOINT</span>
          <strong>{runState.checkpointId === null ? "0 / 1" : "1 / 1"}</strong>
        </div>
        <div className="run-hud__metric">
          <span>DEATHS</span>
          <strong>{runState.deaths}</strong>
        </div>
        <div className="run-hud__metric">
          <span>GRAVITY</span>
          <strong>{gravity}</strong>
        </div>
        <div className="run-hud__actions">
          <button
            type="button"
            className="icon-button"
            onClick={pause}
            disabled={runState.phase !== "RUNNING"}
          >
            Pause
          </button>
          <button type="button" className="icon-button" onClick={openSettings}>
            Settings
          </button>
        </div>
      </div>

      <div
        className="game-frame__status"
        role="status"
        {...(exposeDebugState
          ? {
              "data-phase": runState.phase,
              "data-player-x": Math.round(runState.x),
              "data-camera-x": Math.round(runState.cameraX),
              "data-player-screen-x": Math.round(runState.x - runState.cameraX),
              "data-can-flip": runState.canFlip,
              "data-deaths": runState.deaths,
              "data-elapsed-ms": runState.elapsedMs
            }
          : {})}
      >
        <span className="live-dot">{runtimeStatus}</span>
        {exposeDebugState ? (
          <span>
            {runState.phase} · GRAVITY / {gravity} · FLIP /{" "}
            {runState.canFlip ? "READY" : "LOCKED"} ·{" "}
            {flipKeyLabels[settings.flipKey]} / CLICK / TOUCH · DEATHS /{" "}
            {runState.deaths} · CP / {runState.checkpointId ?? "NONE"} · SCENE /{" "}
            {activeScene}
          </span>
        ) : null}
      </div>
      <div
        ref={containerRef}
        className="game-canvas"
        data-testid="phaser-container"
        aria-label="Gravity Switch Runner game canvas"
      />

      {runState.phase === "PAUSED" ? (
        <div className="game-overlay" role="dialog" aria-label="Run paused">
          <div className="game-overlay__panel">
            <p className="eyebrow">RUN SUSPENDED</p>
            <h2>Signal held.</h2>
            <p>
              Time and simulation are frozen. Resume when you are ready to
              rewrite gravity.
            </p>
            <div className="overlay-actions">
              <button className="play-button" type="button" onClick={resume}>
                Resume run
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={openSettings}
              >
                Settings
              </button>
              <button
                className="text-button"
                type="button"
                onClick={onExitToMenu}
              >
                Exit to mode select
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {runState.phase === "LEVEL_COMPLETE" ? (
        <div className="game-overlay" role="dialog" aria-label="Story result">
          <div className="game-overlay__panel result-panel">
            <p className="eyebrow">
              {mode === "PRACTICE" ? "PRACTICE / SECTION COMPLETE" : "STORY / LEVEL COMPLETE"}
            </p>
            <h2>Archive extracted.</h2>
            <div className="result-grid">
              <div>
                <span>Time</span>
                <strong>{formatElapsed(runState.elapsedMs)}</strong>
              </div>
              <div>
                <span>Deaths</span>
                <strong>{runState.deaths}</strong>
              </div>
              <div>
                <span>Relay</span>
                <strong>
                  {runState.checkpointId === null ? "Missed" : "Synced"}
                </strong>
              </div>
            </div>
            <div className="overlay-actions">
              <button className="play-button" type="button" onClick={restart}>
                {mode === "PRACTICE" ? "Restart section" : "Retry level"}
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={onExitToMenu}
              >
                Return to mode select
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
