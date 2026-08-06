import {
  beginRun,
  createGameSimulation,
  enterMenu,
  getPursuitDistance,
  pauseRun,
  resumeRun,
  stepSimulation,
  type GameSimulation,
  type PursuitConfig
} from "@gravity-runner/game-core";
import type {
  GameCommand,
  GameEvent,
  LevelManifest
} from "@gravity-runner/shared-contracts";
import Phaser from "phaser";

import type { GameEventBridge } from "../bridge.js";
import { bindPhaserInput } from "../inputAdapter.js";
import { createInputCommandController } from "../inputController.js";
import { applyLevelInteractions } from "../levelRuntime.js";
import {
  getStoryLevelManifest,
  type StoryRuntimeLevelId
} from "../levels/storyLevels.js";
import { syncPlayerBody } from "../playerAdapter.js";

const playerId = "player-1";
const playerSize = 48;
const telemetryIntervalMs = 180;
const pressurePursuit: PursuitConfig = {
  enabled: true,
  gracePeriodMs: 1000,
  initialDistance: 260,
  speed: 290,
  acceleration: 22,
  maxSpeed: 390,
  catchDistance: 72
};

export class GameScene extends Phaser.Scene {
  private level: LevelManifest = getStoryLevelManifest("signal-vault-01");
  private simulation: GameSimulation | null = null;
  private queuedCommands: GameCommand[] = [];
  private runner: Phaser.Physics.Arcade.Image | null = null;
  private previousGrounded = false;
  private runnerStateUntil = 0;
  private runnerTextureKey = "runner-run-a";
  private disposeInput: (() => void) | null = null;
  private emittedEventCount = 0;
  private debugBody: Phaser.GameObjects.Graphics | null = null;
  private pursuerVisual: Phaser.GameObjects.Graphics | null = null;
  private pursuerLabel: Phaser.GameObjects.Text | null = null;
  private lastTelemetryAt = Number.NEGATIVE_INFINITY;
  private completionOverlayShown = false;
  private flipKey = "Space";
  private reducedEffects = false;
  private debugEnabled = false;
  private disposeBridgeControls: (() => void)[] = [];

  constructor(private readonly bridge: GameEventBridge) {
    super({ key: "GameScene" });
  }

  create(): void {
    this.level = getStoryLevelManifest(
      this.bridge.selectedLevelId as StoryRuntimeLevelId
    );
    this.bridge.emit("scene:changed", { scene: "GAME" });
    this.cameras.main.setBackgroundColor(0x06101e);
    this.cameras.main.setBounds(0, 0, this.level.width, this.level.height);
    this.physics.world.setBounds(0, 0, this.level.width, this.level.height);
    this.renderLevel(this.level);

    this.runner = this.physics.add.image(
      this.level.spawn.x,
      this.level.spawn.y,
      "runner-run-a"
    );
    this.runner.setGravity(0, 0);
    this.runner.setDepth(30);
    this.runner.setScale(1.15);
    this.cameras.main.startFollow(this.runner, true, 1, 1);

    this.debugBody = this.add.graphics().setDepth(40);
    if (this.level.id === "signal-vault-03") {
      this.pursuerVisual = this.add.graphics().setDepth(25);
      this.pursuerLabel = this.add
        .text(0, 0, "PURSUER", {
          color: "#ff6b8a",
          fontFamily: "monospace",
          fontSize: "11px",
          fontStyle: "bold"
        })
        .setDepth(26)
        .setOrigin(0.5, 1);
    }
    const simulationOptions = {
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
      },
      ...(this.level.id === "signal-vault-03"
        ? { pursuit: pressurePursuit }
        : {})
    };
    this.simulation = createGameSimulation(simulationOptions);
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
    this.previousGrounded = this.simulation.state.player.isGrounded;

    const inputController = createInputCommandController({
      bindings: () => [
        {
          source: "keyboard",
          code: this.flipKey,
          playerId
        },
        {
          source: "pointer",
          button: 0,
          playerId
        }
      ],
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
    this.disposeBridgeControls = [
      this.bridge.on("ui:pause", () => {
        if (this.simulation !== null) {
          pauseRun(this.simulation);
          this.emitTelemetry(this.time.now);
        }
      }),
      this.bridge.on("ui:resume", () => {
        if (this.simulation !== null) {
          resumeRun(this.simulation);
          this.emitTelemetry(this.time.now);
        }
      }),
      this.bridge.on("ui:restart", () => {
        this.scene.stop("HudScene");
        this.scene.restart();
      }),
      this.bridge.on("settings:changed", (settings) => {
        this.flipKey = settings.flipKey;
        this.reducedEffects = settings.reducedEffects;
        this.debugEnabled = settings.debugOverlay;
        this.debugBody?.setVisible(this.debugEnabled);
      })
    ];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.disposeInput?.();
      this.disposeInput = null;
      for (const dispose of this.disposeBridgeControls) {
        dispose();
      }
      this.disposeBridgeControls = [];
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
    this.updateRunnerPresentation(time);
    this.drawPursuer();
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
    this.renderParallax(level);
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

    for (const segment of level.boundarySegments ?? []) {
      const boundary = this.add.graphics().setDepth(-1);
      const floatingHeight = 24;
      boundary.fillStyle(0x1d4960, 0.84);
      boundary.fillRoundedRect(
        segment.x,
        segment.topHeight,
        segment.width,
        floatingHeight,
        8
      );
      boundary.fillRoundedRect(
        segment.x,
        level.height - segment.bottomHeight - floatingHeight,
        segment.width,
        floatingHeight,
        8
      );
      boundary.lineStyle(2, 0x79dfff, 0.7);
      boundary.strokeRoundedRect(
        segment.x,
        segment.topHeight,
        segment.width,
        floatingHeight,
        8
      );
      boundary.strokeRoundedRect(
        segment.x,
        level.height - segment.bottomHeight - floatingHeight,
        segment.width,
        floatingHeight,
        8
      );
      if (segment.topHeight > 72 || segment.bottomHeight > 72) {
        this.add
          .text(
            segment.x + segment.width / 2,
            segment.topHeight + 18,
            "NARROW PASSAGE",
            {
              color: "#79dfff",
              fontFamily: "monospace",
              fontSize: "10px",
              fontStyle: "bold"
            }
          )
          .setOrigin(0.5, 0)
          .setDepth(2);
      }
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

    for (const zone of level.boostZones ?? []) {
      const boost = this.add.graphics().setDepth(7);
      boost.fillStyle(0xffd166, 0.24);
      boost.fillRoundedRect(zone.x, zone.y, zone.width, zone.height, 10);
      boost.lineStyle(2, 0xffd166, 0.9);
      boost.strokeRoundedRect(zone.x, zone.y, zone.width, zone.height, 10);
      boost.lineBetween(
        zone.x + 24,
        zone.y + zone.height / 2,
        zone.x + zone.width - 24,
        zone.y + zone.height / 2
      );
      this.add
        .text(zone.x + zone.width / 2, zone.y + zone.height / 2, "BOOST", {
          color: "#ffe6a3",
          fontFamily: "monospace",
          fontSize: "11px",
          fontStyle: "bold"
        })
        .setOrigin(0.5)
        .setDepth(8);
    }

    for (const block of level.terrainBlocks ?? []) {
      const terrain = this.add.graphics().setDepth(9);
      terrain.fillStyle(0x5d345e, 0.88);
      terrain.fillRoundedRect(block.x, block.y, block.width, block.height, 10);
      terrain.lineStyle(3, 0xff6b8a, 0.78);
      terrain.strokeRoundedRect(
        block.x,
        block.y,
        block.width,
        block.height,
        10
      );
      terrain.lineStyle(2, 0xffd166, 0.45);
      for (let y = block.y + 24; y < block.y + block.height; y += 32) {
        terrain.lineBetween(block.x + 14, y, block.x + block.width - 14, y);
      }
      this.add
        .text(block.x + block.width / 2, block.y - 12, "BLOCK", {
          color: "#ff9ab0",
          fontFamily: "monospace",
          fontSize: "10px",
          fontStyle: "bold"
        })
        .setOrigin(0.5, 1)
        .setDepth(10);
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

  private renderParallax(level: LevelManifest): void {
    const far = this.add.graphics().setDepth(-30).setScrollFactor(0.12);
    far.fillStyle(0x071827, 1);
    far.fillRect(0, 0, level.width + 1800, level.height);
    far.fillStyle(0x0b2638, 0.92);
    for (let x = 0; x < level.width + 1800; x += 180) {
      const height = 90 + ((x / 180) % 4) * 34;
      far.fillRect(x, level.height - 72 - height, 120, height);
      far.fillCircle(x + 30, level.height - 96 - height, 3);
      far.fillCircle(x + 62, level.height - 112 - height, 3);
    }

    const near = this.add.graphics().setDepth(-20).setScrollFactor(0.32);
    near.fillStyle(0x123247, 0.6);
    for (let x = 0; x < level.width + 1400; x += 260) {
      near.fillTriangle(
        x,
        level.height - 72,
        x + 150,
        level.height - 310,
        x + 330,
        level.height - 72
      );
      near.lineStyle(2, 0x2b6680, 0.32);
      near.lineBetween(x + 150, level.height - 310, x + 150, level.height - 72);
    }
  }

  private updateRunnerPresentation(time: number): void {
    if (this.runner === null || this.simulation === null) {
      return;
    }
    const player = this.simulation.state.player;
    if (!player.alive || this.simulation.state.phase === "DEAD") {
      this.setRunnerTexture("runner-death");
      return;
    }
    if (this.simulation.state.phase === "CHECKPOINT_RESPAWN") {
      this.setRunnerTexture("runner-land");
      this.runnerStateUntil = time + 280;
      return;
    }
    if (time < this.runnerStateUntil) {
      return;
    }
    if (!player.isGrounded) {
      this.setRunnerTexture("runner-flip");
      return;
    }
    this.setRunnerTexture(
      Math.floor(this.simulation.state.elapsedMs / 180) % 2 === 0
        ? "runner-run-a"
        : "runner-run-b"
    );
    if (!this.previousGrounded && player.isGrounded) {
      this.setRunnerTexture("runner-land");
      this.runnerStateUntil = time + 220;
    }
    this.previousGrounded = player.isGrounded;
  }

  private handleEvents(events: readonly GameEvent[]): void {
    for (const event of events) {
      if (event.type === "CHECKPOINT_REACHED") {
        this.flashMessage("RELAY SYNCHRONIZED", "#72fbc1");
        this.runnerStateUntil = this.time.now + 220;
        this.setRunnerTexture("runner-land");
      } else if (event.type === "PLAYER_FLIPPED") {
        this.runnerStateUntil = this.time.now + 300;
        this.setRunnerTexture("runner-flip");
      } else if (event.type === "PLAYER_DIED") {
        this.flashMessage("SIGNAL LOST · RESTORING", "#ffc857");
        this.runnerStateUntil = Number.POSITIVE_INFINITY;
        this.setRunnerTexture("runner-death");
      }
    }
  }

  private setRunnerTexture(key: string): void {
    if (this.runner === null || this.runnerTextureKey === key) {
      return;
    }
    this.runnerTextureKey = key;
    this.runner.setTexture(key);
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
      paused: this.reducedEffects,
      targets: text,
      alpha: 0,
      y: text.y - 22,
      delay: 650,
      duration: 350,
      onComplete: () => text.destroy()
    });
    if (this.reducedEffects) {
      this.time.delayedCall(750, () => text.destroy());
    }
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
    this.debugBody.setVisible(this.debugEnabled);
    if (!this.debugEnabled) {
      return;
    }
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

  private drawPursuer(): void {
    if (
      this.simulation === null ||
      this.pursuerVisual === null ||
      this.pursuerLabel === null ||
      this.simulation.pursuit === null
    ) {
      return;
    }

    const player = this.simulation.state.player;
    const x = this.simulation.pursuerX;
    const y = player.y;
    const distance = getPursuitDistance(this.simulation) ?? 0;
    const intensity = Math.max(0.22, Math.min(1, 1 - (distance - 72) / 560));

    this.pursuerVisual.clear();
    this.pursuerVisual.lineStyle(3, 0xff466f, 0.2 + intensity * 0.55);
    this.pursuerVisual.strokeCircle(x, y, 34 + intensity * 8);
    this.pursuerVisual.fillStyle(0x3a1029, 0.86);
    this.pursuerVisual.fillCircle(x, y, 24);
    this.pursuerVisual.lineStyle(2, 0xff6b8a, 0.9);
    this.pursuerVisual.strokeCircle(x, y, 18);
    this.pursuerVisual.fillStyle(0xff466f, 0.95);
    this.pursuerVisual.fillTriangle(x - 9, y - 8, x + 11, y, x - 9, y + 8);
    this.pursuerVisual.lineStyle(4, 0xff466f, 0.25 + intensity * 0.4);
    this.pursuerVisual.lineBetween(x - 72, y, x - 30, y);
    this.pursuerLabel.setPosition(x, y - 38);
    this.pursuerLabel.setAlpha(
      this.simulation.state.phase === "LEVEL_COMPLETE"
        ? 0
        : 0.65 + intensity * 0.35
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
      elapsedMs: state.elapsedMs,
      tick: Math.round(this.simulation.clockMs / this.simulation.fixedDeltaMs),
      fps: Math.round(this.game.loop.actualFps),
      canFlip: state.phase === "RUNNING" && state.player.isGrounded,
      x: state.player.x,
      cameraX: this.cameras.main.scrollX,
      pursuitDistance: getPursuitDistance(this.simulation)
    });
  }
}
