import Phaser from "phaser";

import type { GameEventBridge } from "../bridge.js";

export class PreloadScene extends Phaser.Scene {
  constructor(private readonly bridge: GameEventBridge) {
    super({ key: "PreloadScene" });
  }

  create(): void {
    this.bridge.emit("scene:changed", { scene: "PRELOAD" });

    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    this.add
      .text(centerX, centerY - 18, "SYNCHRONIZING SIGNAL VAULT", {
        color: "#72fbc1",
        fontFamily: "monospace",
        fontSize: "18px",
        letterSpacing: 3
      })
      .setOrigin(0.5);
    this.add.rectangle(centerX, centerY + 24, 280, 4, 0x183a4d).setOrigin(0.5);
    this.add.rectangle(centerX, centerY + 24, 280, 4, 0x72fbc1).setOrigin(0.5);

    this.time.delayedCall(80, () => this.scene.start("GameScene"));
  }
}
