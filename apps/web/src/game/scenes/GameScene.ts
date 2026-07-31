import {
  beginRun,
  createGameSimulation,
  enterMenu,
  stepSimulation,
  type GameSimulation
} from "@gravity-runner/game-core";
import type {
  GameCommand,
  GameEvent,
  LevelManifest
} from "@gravity-runner/shared-contracts";
import Phaser from "phaser";

import type { GameEventBridge } from "../bridge.js";
import { bindPhaserInput } from "../inputAdapter.js";
import {
  createInputCommandController,
  defaultInputBindings
} from "../inputController.js";
import { applyLevelInteractions } from "../levelRuntime.js";
import { signalVaultLevel } from "../levels/signalVault.js";
import { syncPlayerBody } from "../playerAdapter.js";

const playerId = "player-1";
const playerSize = 48;
const telemetryIntervalMs = 180;

export class GameScene extends Phaser.Scene {
  private readonly level: LevelManifest = signalVaultLevel;
  private simulation: GameSimulation | null = null;
  private queuedCommands: GameCommand[] = [];
  private runner: Phaser.Physics.Arcade.Image | null = null;
  private disposeInput: (() => void) | null = null;
  private emittedEventCount = 0;
  private debugBody: Phaser.GameObjects.Graphics | null = null;
  private lastTelemetryAt = Number.NEGATIVE_INFINITY;
  private completionOverlayShown = false;

  constructor(private readonly bridge: GameEventBridge) {
    super({ key: "GameScene" });
  }

  create(): void {
    this.bridge.emit("scene:changed", { scene: "GAME" });
    this.cameras.main.setBackgroundColor(0x06101e);
    this.cameras.main.setBounds(0, 0, this.level.width, this.level.height);
    this.physics.world.setBounds(0, 0, this.level.width, this.level.height);
    this.renderLevel(this.level);

    this.runner = this.physics.add.image(
      this.level.spawn.x,
      this.level.spawn.y,
      "runner-placeholder"
    );
    this.runner.setGravity(0, 0);
    this.runner.setDepth(30);
    this.runner.setScale(1.15);
    this.cameras.main.startFollow(this.runner, true, 1, 1);

    this.debugBody = this.add.graphics().setDepth(40);
    this.simulation = createGameSimulation({
      levelId: this.level.id,
      levelVersion: this.level.version,
      playerId,
      spawn: this.level.spawn,
      tuning: {
        tickRateHz: 60,
        runSpeed: this.level.runSpeed,
        gravityAcceleration: 1200,
        maxVerticalSpeed: 720,
        flipVelocityDamping: 0.2,
        flipCooldownMs: 100,
        respawnDelayMs: 450,
        countdownMs: 0
      }
    });
    enterMenu(this.simulation);
    beginRun(this.simulation);
    stepSimulation(this.simulation, this.simulation.fixedDeltaMs);
    applyLevelInteractions(
      this.simulation,
      this.level,
      this.simulation.clockMs,
      playerSize
    );
    syncPlayerBody(this.runner, this.simulation.state.player);

    const inputController = createInputCommandController({
      bindings: defaultInputBindings,
      cooldownMs: this.simulation.tuning.flipCooldownMs,
      getClockMs: () => this.simulation?.clockMs ?? 0,
      isEnabled: () =>
        this.scene.isActive() &&
        this.simulation?.state.phase === "RUNNING" &&
        this.simulation.state.player.isGrounded,
      dispatch: (command) => this.queuedCommands.push(command)
    });
    this.disposeInput = bindPhaserInput(
      { keyboard: this.input.keyboard, pointer: this.input },
      inputController
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.disposeInput?.();
      this.disposeInput = null;
      inputController.reset();
    });

    this.scene.launch("HudScene");
    this.emitPlayerState();
    this.emitTelemetry(0);
    this.bridge.emit("runtime:ready", {
      scene: "GAME",
      width: this.scale.width,
      height: this.scale.height
    });
  }

  override update(time: number, delta: number): void {
    if (this.simulation === null || this.runner === null) {
      return;
    }

    const commands = this.queuedCommands;
    this.queuedCommands = [];
    stepSimulation(this.simulation, Math.min(delta, 250), commands);
    applyLevelInteractions(
      this.simulation,
      this.level,
      this.simulation.clockMs,
      playerSize
    );
    syncPlayerBody(this.runner, this.simulation.state.player);
    this.drawDebugBody();

    if (this.simulation.events.length !== this.emittedEventCount) {
      const events = this.simulation.events.slice(this.emittedEventCount);
      this.emittedEventCount = this.simulation.events.length;
      this.handleEvents(events);
      this.emitPlayerState();
      this.emitTelemetry(time);
    } else if (time - this.lastTelemetryAt >= telemetryIntervalMs) {
      this.emitTelemetry(time);
    }

    if (
      this.simulation.state.phase === "LEVEL_COMPLETE" &&
      !this.completionOverlayShown
    ) {
      this.completionOverlayShown = true;
      this.showCompletionOverlay();
    }
  }

  private renderLevel(level: LevelManifest): void {
    const grid = this.add.graphics().setDepth(-10);
    grid.lineStyle(1, 0x15364d, 0.42);
    for (let x = 0; x <= level.width; x += 64) {
      grid.lineBetween(x, 0, x, level.height);
    }
    for (let y = 0; y <= level.height; y += 64) {
      grid.lineBetween(0, y, level.width, y);
    }

    for (const platform of level.platforms) {
      this.add
        .rectangle(
          platform.x + platform.width / 2,
          platform.y + platform.height / 2,
          platform.width,
          platform.height,
          platform.y === 0 ? 0x123247 : 0x0d2a3c
        )
        .setStrokeStyle(2, 0x2b6680, 0.65);
    }

    for (const hazard of level.hazards) {
      const graphics = this.add.graphics().setDepth(8);
      const color = hazard.type === "electric" ? 0x79dfff : 0xffc857;
      graphics.fillStyle(color, 0.95);
      if (hazard.type === "spikes") {
        const teeth = 3;
        const toothWidth = hazard.width / teeth;
        const pointsDown = hazard.y < level.height / 2;
        for (let index = 0; index < teeth; index += 1) {
          const left = hazard.x + index * toothWidth;
          const right = left + toothWidth;
          const baseY = pointsDown ? hazard.y : hazard.y + hazard.height;
          const tipY = pointsDown ? hazard.y + hazard.height : hazard.y;
          graphics.fillTriangle(
            left,
            baseY,
            right,
            baseY,
            left + toothWidth / 2,
            tipY
          );
        }
      } else {
        graphics.fillRoundedRect(
          hazard.x,
          hazard.y,
          hazard.width,
          hazard.height,
          8
        );
        graphics.lineStyle(3, 0x06101e, 0.9);
        graphics.lineBetween(
          hazard.x + 12,
          hazard.y + hazard.height - 10,
          hazard.x + hazard.width / 2,
          hazard.y + 10
        );
        graphics.lineBetween(
          hazard.x + hazard.width / 2,
          hazard.y + 10,
          hazard.x + hazard.width - 12,
          hazard.y + hazard.height - 10
        );
      }
    }

    for (const checkpoint of level.checkpoints) {
      this.add
        .rectangle(
          checkpoint.x,
          level.height / 2,
          4,
          level.height - 144,
          0x72fbc1,
          0.28
        )
        .setStrokeStyle(1, 0x72fbc1, 0.7);
      this.add
        .text(checkpoint.x + 14, level.height - 112, "RELAY / CHECKPOINT", {
          color: "#72fbc1",
          fontFamily: "monospace",
          fontSize: "13px",
          fontStyle: "bold"
        })
        .setOrigin(0, 1);
    }

    this.add
      .rectangle(
        level.finish.x + level.finish.width / 2,
        level.finish.y + level.finish.height / 2,
        level.finish.width,
        level.finish.height,
        0x72fbc1,
        0.13
      )
      .setStrokeStyle(3, 0x72fbc1, 0.85);
    this.add
      .text(
        level.finish.x + level.finish.width / 2,
        level.height / 2,
        "EXTRACT",
        {
          color: "#72fbc1",
          fontFamily: "monospace",
          fontSize: "18px",
          fontStyle: "bold"
        }
      )
      .setOrigin(0.5)
      .setAngle(-90);

    const instructions = [
      { x: 760, y: 560, text: "01 / FLIP BEFORE THE SPIKES" },
      { x: 1420, y: 150, text: "02 / LAND TO RE-ARM" },
      { x: 2060, y: 560, text: "03 / RELAY SAVES PROGRESS" },
      { x: 2920, y: 150, text: "04 / CROSS THE VOID" }
    ];
    for (const instruction of instructions) {
      this.add.text(instruction.x, instruction.y, instruction.text, {
        color: "#55788c",
        fontFamily: "monospace",
        fontSize: "13px",
        letterSpacing: 1
      });
    }
  }

  private handleEvents(events: readonly GameEvent[]): void {
    for (const event of events) {
      if (event.type === "CHECKPOINT_REACHED") {
        this.flashMessage("RELAY SYNCHRONIZED", "#72fbc1");
      } else if (event.type === "PLAYER_DIED") {
        this.flashMessage("SIGNAL LOST · RESTORING", "#ffc857");
      }
    }
  }

  private flashMessage(message: string, color: string): void {
    const text = this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 90, message, {
        color,
        fontFamily: "monospace",
        fontSize: "20px",
        fontStyle: "bold",
        backgroundColor: "#06101ed9",
        padding: { x: 18, y: 12 }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100);
    this.tweens.add({
      targets: text,
      alpha: 0,
      y: text.y - 22,
      delay: 650,
      duration: 350,
      onComplete: () => text.destroy()
    });
  }

  private showCompletionOverlay(): void {
    this.add
      .rectangle(
        this.scale.width / 2,
        this.scale.height / 2,
        520,
        190,
        0x06101e,
        0.94
      )
      .setStrokeStyle(2, 0x72fbc1, 0.8)
      .setScrollFactor(0)
      .setDepth(110);
    this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2 - 25,
        "VAULT EXTRACTED",
        {
          color: "#e8f6ff",
          fontFamily: "monospace",
          fontSize: "30px",
          fontStyle: "bold",
          letterSpacing: 4
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(111);
    this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2 + 32,
        "Original vertical slice complete",
        {
          color: "#72fbc1",
          fontFamily: "monospace",
          fontSize: "15px"
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(111);
  }

  private drawDebugBody(): void {
    if (this.runner === null || this.debugBody === null) {
      return;
    }
    const half = playerSize / 2;
    this.debugBody.clear();
    this.debugBody.lineStyle(1, 0x72fbc1, 0.75);
    this.debugBody.strokeRect(
      this.runner.x - half,
      this.runner.y - half,
      playerSize,
      playerSize
    );
    this.debugBody.lineBetween(
      this.runner.x,
      this.runner.y,
      this.runner.x,
      this.runner.y +
        (this.simulation?.state.player.gravityDirection === 1 ? 34 : -34)
    );
  }

  private emitPlayerState(): void {
    if (this.simulation === null) {
      return;
    }
    const player = this.simulation.state.player;
    this.bridge.emit("player:state", {
      gravity: player.gravityDirection === 1 ? "DOWN" : "UP",
      commandCount: this.simulation.events.filter(
        (event) => event.type === "PLAYER_FLIPPED"
      ).length,
      x: player.x,
      y: player.y
    });
  }

  private emitTelemetry(time: number): void {
    if (this.simulation === null) {
      return;
    }
    const state = this.simulation.state;
    if (state.phase === "BOOT" || state.phase === "MENU") {
      return;
    }
    this.lastTelemetryAt = time;
    this.bridge.emit("run:telemetry", {
      phase: state.phase,
      deaths: state.deaths,
      checkpointId: state.player.checkpointId,
      tick: Math.round(this.simulation.clockMs / this.simulation.fixedDeltaMs),
      fps: Math.round(this.game.loop.actualFps),
      canFlip: state.phase === "RUNNING" && state.player.isGrounded,
      x: state.player.x,
      cameraX: this.cameras.main.scrollX
    });
  }
}
