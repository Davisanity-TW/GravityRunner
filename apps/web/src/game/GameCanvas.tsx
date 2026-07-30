import { useEffect, useMemo, useRef, useState } from "react";

import { GameEventBridge } from "./bridge.js";
import { phaserLifecycle } from "./lifecycle.js";

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const bridge = useMemo(() => new GameEventBridge(), []);
  const [runtimeStatus, setRuntimeStatus] = useState("Starting runtime…");
  const [activeScene, setActiveScene] = useState("BOOT");

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
    const runtime = phaserLifecycle.mount(container, bridge);

    return () => {
      offReady();
      offScene();
      runtime.dispose();
    };
  }, [bridge]);

  return (
    <div className="game-frame">
      <div className="game-frame__status" role="status">
        <span className="live-dot">{runtimeStatus}</span>
        <span>SCENE / {activeScene}</span>
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
