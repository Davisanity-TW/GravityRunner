import { useEffect, useMemo, useRef, useState } from "react";

import { GameEventBridge } from "./bridge.js";
import { phaserLifecycle } from "./lifecycle.js";

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const bridge = useMemo(() => new GameEventBridge(), []);
  const [runtimeStatus, setRuntimeStatus] = useState("Starting runtime…");
  const [activeScene, setActiveScene] = useState("BOOT");
  const [gravity, setGravity] = useState<"DOWN" | "UP">("DOWN");
  const [runState, setRunState] = useState({
    phase: "COUNTDOWN",
    deaths: 0,
    checkpointId: null as string | null,
    canFlip: false,
    x: 0,
    cameraX: 0
  });

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
    });
    const offPlayerState = bridge.on("player:state", (state) => {
      setGravity(state.gravity);
    });
    const offTelemetry = bridge.on("run:telemetry", (state) => {
      setRunState(state);
    });
    const runtime = phaserLifecycle.mount(container, bridge);

    return () => {
      offTelemetry();
      offPlayerState();
      offReady();
      offScene();
      runtime.dispose();
    };
  }, [bridge]);

  return (
    <div className="game-frame">
      <div
        className="game-frame__status"
        role="status"
        data-phase={runState.phase}
        data-player-x={Math.round(runState.x)}
        data-camera-x={Math.round(runState.cameraX)}
        data-player-screen-x={Math.round(runState.x - runState.cameraX)}
        data-can-flip={runState.canFlip}
        data-deaths={runState.deaths}
      >
        <span className="live-dot">{runtimeStatus}</span>
        <span>
          {runState.phase} · GRAVITY / {gravity} · FLIP /{" "}
          {runState.canFlip ? "READY" : "LOCKED"} · DEATHS / {runState.deaths} ·
          CP / {runState.checkpointId ?? "NONE"} · SCENE / {activeScene}
        </span>
      </div>
      <div
        ref={containerRef}
        className="game-canvas"
        data-testid="phaser-container"
        aria-label="Gravity Switch Runner game canvas"
      />
    </div>
  );
}
