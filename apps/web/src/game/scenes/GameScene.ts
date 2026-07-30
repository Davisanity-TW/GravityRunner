import Phaser from "phaser";

import type { GameEventBridge } from "../bridge.js";

export class GameScene extends Phaser.Scene {
  constructor(private readonly bridge: GameEventBridge) {
    super({ key: "GameScene" });
  }

  create(): void {
    this.bridge.emit("scene:changed", { scene: "GAME" });

    const width = this.scale.width;
    const height = this.scale.height;
    this.cameras.main.setBackgroundColor(0x06101e);

    const grid = this.add.graphics();
    grid.lineStyle(1, 0x15364d, 0.55);
    for (let x = 0; x <= width; x += 64) {
      grid.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += 64) {
      grid.lineBetween(0, y, width, y);
    }

    this.add.rectangle(width / 2, height - 46, width, 92, 0x0d2638);
    this.add.rectangle(width / 2, 34, width, 68, 0x0d2638);

    for (let index = 0; index < 6; index += 1) {
      const x = width * 0.38 + index * 94;
      const y = index % 2 === 0 ? height - 106 : 74;
      this.add.image(x, y, "spark-placeholder").setAlpha(0.85);
    }

    const runner = this.add.image(
      width * 0.22,
      height - 118,
      "runner-placeholder"
    );
    this.tweens.add({
      targets: runner,
      y: runner.y - 8,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut"
    });

    this.add
      .text(width / 2, height / 2, "PHASER RUNTIME ONLINE", {
        color: "#e8f6ff",
        fontFamily: "monospace",
        fontSize: "26px",
        fontStyle: "bold",
        letterSpacing: 4
      })
      .setOrigin(0.5);
    this.add
      .text(
        width / 2,
        height / 2 + 42,
        "Gameplay adapter connects in the next task",
        {
          color: "#7995a8",
          fontFamily: "sans-serif",
          fontSize: "16px"
        }
      )
      .setOrigin(0.5);

    this.scene.launch("HudScene");
    this.bridge.emit("runtime:ready", {
      scene: "GAME",
      width,
      height
    });
  }
}
