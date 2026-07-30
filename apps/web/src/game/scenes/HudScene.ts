import Phaser from "phaser";

import type { GameEventBridge } from "../bridge.js";

export class HudScene extends Phaser.Scene {
  private gravityLabel: Phaser.GameObjects.Text | null = null;
  private offPlayerState: (() => void) | null = null;

  constructor(private readonly bridge: GameEventBridge) {
    super({ key: "HudScene", active: false });
  }

  create(): void {
    this.bridge.emit("scene:changed", { scene: "HUD" });

    this.add
      .text(28, 24, "SV-01 / ADAPTER TEST", {
        color: "#72fbc1",
        fontFamily: "monospace",
        fontSize: "15px",
        fontStyle: "bold"
      })
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
      .text(this.scale.width / 2, 24, "GRAVITY / DOWN", {
        color: "#e8f6ff",
        fontFamily: "monospace",
        fontSize: "14px",
        fontStyle: "bold"
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0);
    this.offPlayerState = this.bridge.on("player:state", ({ gravity }) => {
      this.gravityLabel?.setText(`GRAVITY / ${gravity}`);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.offPlayerState?.();
      this.offPlayerState = null;
    });

    this.bridge.emit("hud:status", {
      label: "Runtime",
      value: "Ready"
    });
  }
}
