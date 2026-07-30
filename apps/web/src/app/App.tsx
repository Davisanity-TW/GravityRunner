import { lazy, Suspense, useState } from "react";

const GameCanvas = lazy(async () => {
  const module = await import("../game/GameCanvas.js");
  return { default: module.GameCanvas };
});

type AppScreen = "menu" | "game";

export function App() {
  const [screen, setScreen] = useState<AppScreen>("menu");

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Gravity Switch Runner home">
          <span className="brand-mark" aria-hidden="true">
            G
          </span>
          <span>
            <strong>Gravity Switch Runner</strong>
            <small>Signal Vault Prototype</small>
          </span>
        </a>
        <span className="build-chip">PHASE 1 · WEB/PHASER SHELL</span>
      </header>

      {screen === "menu" ? (
        <section className="mission-control" aria-labelledby="mission-title">
          <div className="hero-copy">
            <p className="eyebrow">ORIGINAL PROTOTYPE / MISSION 01</p>
            <h1 id="mission-title">
              Run the floor.
              <span>Rewrite gravity.</span>
            </h1>
            <p className="lede">
              Enter the Signal Vault, a synthetic archive built around one
              decisive command: flip. This milestone verifies the React shell
              and Phaser runtime boundary before gameplay physics arrive.
            </p>
            <div className="hero-actions">
              <button
                className="play-button"
                type="button"
                onClick={() => setScreen("game")}
              >
                <span>Initialize run</span>
                <span aria-hidden="true">→</span>
              </button>
              <span className="control-hint">SPACE / CLICK / TOUCH · SOON</span>
            </div>
          </div>

          <aside className="mission-card" aria-label="Mission telemetry">
            <div className="mission-card__header">
              <span>SV-01</span>
              <span className="live-dot">SYSTEM READY</span>
            </div>
            <div className="orbit-visual" aria-hidden="true">
              <span className="orbit orbit--outer" />
              <span className="orbit orbit--inner" />
              <span className="runner-glyph">◇</span>
            </div>
            <dl className="telemetry-grid">
              <div>
                <dt>Runtime</dt>
                <dd>Phaser 4</dd>
              </div>
              <div>
                <dt>Viewport</dt>
                <dd>Adaptive</dd>
              </div>
              <div>
                <dt>Assets</dt>
                <dd>Original</dd>
              </div>
              <div>
                <dt>Backend</dt>
                <dd>Offline</dd>
              </div>
            </dl>
          </aside>
        </section>
      ) : (
        <section className="runtime-screen" aria-label="Game runtime">
          <div className="runtime-toolbar">
            <div>
              <p className="eyebrow">LIVE CANVAS / SIGNAL VAULT</p>
              <h1>Runtime integration test</h1>
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
            <GameCanvas />
          </Suspense>
        </section>
      )}

      <footer className="footer">
        <span>GRAVITY SYSTEMS / TAIPEI</span>
        <span>BUILD 0.1.0-PROTOTYPE</span>
      </footer>
    </main>
  );
}
