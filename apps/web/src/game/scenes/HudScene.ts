import Phaser from "phaser";

import type { GameEventBridge } from "../bridge.js";

export class HudScene extends Phaser.Scene {
  private currentGravity: "DOWN" | "UP" = "DOWN";
  private gravityLabel: Phaser.GameObjects.Text | null = null;
  private debugLabel: Phaser.GameObjects.Text | null = null;
  private offPlayerState: (() => void) | null = null;
  private offTelemetry: (() => void) | null = null;
  private offSettings: (() => void) | null = null;

  constructor(private readonly bridge: GameEventBridge) {
    super({ key: "HudScene", active: false });
  }

  create(): void {
    this.bridge.emit("scene:changed", { scene: "HUD" });

    this.add
      .text(
        28,
        24,
        this.bridge.selectedMode === "ENDLESS"
          ? "ENDLESS / BATCH 02 · 10 CHECKPOINTS"
          : this.bridge.selectedLevelId === "signal-vault-03"
          ? "SV-03 / PRESSURE FINALE"
          : this.bridge.selectedLevelId === "signal-vault-02"
            ? "SV-02 / SWITCHBACK"
            : "SV-01 / RELAY RUN",
        {
          color: "#72fbc1",
          fontFamily: "monospace",
          fontSize: "15px",
          fontStyle: "bold"
        }
      )
      .setScrollFactor(0);

    this.add
      .text(this.scale.width - 28, 24, "60 HZ TARGET", {
        color: "#8ca8b8",
        fontFamily: "monospace",
        fontSize: "14px"
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    this.gravityLabel = this.add
      .text(this.scale.width / 2, 20, "GRAVITY / DOWN · FLIP / READY", {
        color: "#e8f6ff",
        fontFamily: "monospace",
        fontSize: "14px",
        fontStyle: "bold"
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0);
    this.offPlayerState = this.bridge.on("player:state", ({ gravity }) => {
      this.currentGravity = gravity;
      this.gravityLabel?.setText(`GRAVITY / ${gravity}`);
    });
    this.debugLabel = this.add
      .text(
        this.scale.width - 28,
        this.scale.height - 26,
        "TICK 000000 · 60 FPS · CP NONE",
        {
          color: "#6f899a",
          fontFamily: "monospace",
          fontSize: "12px"
        }
      )
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setVisible(false);
    this.offSettings = this.bridge.on(
      "settings:changed",
      ({ debugOverlay }) => {
        this.debugLabel?.setVisible(debugOverlay);
      }
    );
    this.offTelemetry = this.bridge.on("run:telemetry", (state) => {
      this.gravityLabel?.setText(
        `GRAVITY / ${this.currentGravity} · FLIP / ${
          state.canFlip ? "READY" : "LOCKED"
        }${
          state.pursuitDistance !== null && state.pursuitDistance < 180
            ? " · THREAT CLOSE"
            : ""
        }`
      );
      this.debugLabel?.setText(
        `TICK ${state.tick.toString().padStart(6, "0")} · ${state.fps} FPS · CP ${
          state.checkpointId ?? "NONE"
        } · X ${Math.round(state.x)}${
          state.pursuitDistance === null
            ? ""
            : ` · PURSUER ${Math.round(state.pursuitDistance)}`
        }`
      );
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.offPlayerState?.();
      this.offPlayerState = null;
      this.offTelemetry?.();
      this.offTelemetry = null;
      this.offSettings?.();
      this.offSettings = null;
    });

    this.bridge.emit("hud:status", {
      label: "Runtime",
      value: "Ready"
    });
  }
}
