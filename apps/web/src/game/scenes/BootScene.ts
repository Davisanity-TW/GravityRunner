import Phaser from "phaser";

import type { GameEventBridge } from "../bridge.js";

export class BootScene extends Phaser.Scene {
  constructor(private readonly bridge: GameEventBridge) {
    super({ key: "BootScene" });
  }

  create(): void {
    this.bridge.emit("scene:changed", { scene: "BOOT" });

    const runner = this.make.graphics({ x: 0, y: 0 }, false);
    runner.fillStyle(0x72fbc1, 1);
    runner.fillRoundedRect(4, 4, 40, 40, 10);
    runner.lineStyle(3, 0x071521, 1);
    runner.strokeRoundedRect(4, 4, 40, 40, 10);
    runner.generateTexture("runner-placeholder", 48, 48);
    runner.destroy();

    const spark = this.make.graphics({ x: 0, y: 0 }, false);
    spark.fillStyle(0xffc857, 1);
    spark.fillTriangle(12, 0, 24, 24, 0, 24);
    spark.generateTexture("spark-placeholder", 24, 24);
    spark.destroy();

    this.scene.start("PreloadScene");
  }
}
