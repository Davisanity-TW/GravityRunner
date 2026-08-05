import Phaser from "phaser";

import type { GameEventBridge } from "../bridge.js";

export class BootScene extends Phaser.Scene {
  constructor(private readonly bridge: GameEventBridge) {
    super({ key: "BootScene" });
  }

  create(): void {
    this.bridge.emit("scene:changed", { scene: "BOOT" });

    this.createRunnerTexture("runner-run-a", 7, 34);
    this.createRunnerTexture("runner-run-b", 13, 28);
    this.createRunnerTexture("runner-flip", 24, 24, true);
    this.createRunnerTexture("runner-land", 17, 37, false, true);
    this.createRunnerTexture("runner-death", 24, 24, false, false, true);

    const spark = this.make.graphics({ x: 0, y: 0 }, false);
    spark.fillStyle(0xffc857, 1);
    spark.fillTriangle(12, 0, 24, 24, 0, 24);
    spark.generateTexture("spark-placeholder", 24, 24);
    spark.destroy();

    this.scene.start("PreloadScene");
  }

  private createRunnerTexture(
    key: string,
    leftFootX: number,
    rightFootX: number,
    airborne = false,
    landing = false,
    dead = false
  ): void {
    const runner = this.make.graphics({ x: 0, y: 0 }, false);
    if (dead) {
      runner.lineStyle(4, 0xff6b7a, 1);
      runner.lineBetween(8, 8, 40, 40);
      runner.lineBetween(40, 8, 8, 40);
      runner.lineStyle(2, 0xffc857, 0.9);
      runner.strokeCircle(24, 24, 18);
    } else {
      runner.fillStyle(airborne ? 0xb7a2ff : 0x72fbc1, 1);
      runner.fillRoundedRect(7, landing ? 13 : 7, 34, landing ? 28 : 34, 11);
      runner.lineStyle(3, 0x071521, 1);
      runner.strokeRoundedRect(7, landing ? 13 : 7, 34, landing ? 28 : 34, 11);
      runner.fillStyle(0x071521, 0.94);
      runner.fillTriangle(17, 18, 31, 18, 24, 31);
      runner.lineStyle(4, 0x72fbc1, 1);
      runner.lineBetween(leftFootX, 40, leftFootX - 3, 47);
      runner.lineBetween(rightFootX, 40, rightFootX + 3, 47);
      if (airborne) {
        runner.lineStyle(2, 0xffc857, 0.9);
        runner.strokeCircle(24, 24, 21);
      }
    }
    runner.generateTexture(key, 48, 48);
    runner.destroy();
  }
}
