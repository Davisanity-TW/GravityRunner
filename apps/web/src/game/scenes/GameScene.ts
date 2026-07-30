import {
  beginRun,
  createGameSimulation,
  enterMenu,
  setSurfaceContact,
  stepSimulation,
  type GameSimulation
} from "@gravity-runner/game-core";
import type { GameCommand } from "@gravity-runner/shared-contracts";
import Phaser from "phaser";

import type { GameEventBridge } from "../bridge.js";
import { bindPhaserInput } from "../inputAdapter.js";
import {
  createInputCommandController,
  defaultInputBindings
} from "../inputController.js";
import { syncPlayerBody } from "../playerAdapter.js";

const playerId = "player-1";
const floorY = 602;
const ceilingY = 112;

export class GameScene extends Phaser.Scene {
  private simulation: GameSimulation | null = null;
  private queuedCommands: GameCommand[] = [];
  private runner: Phaser.Physics.Arcade.Image | null = null;
  private disposeInput: (() => void) | null = null;
  private emittedEventCount = 0;

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

    this.runner = this.physics.add.image(
      width * 0.22,
      floorY,
      "runner-placeholder"
    );
    this.runner.setGravity(0, 0);
    this.runner.setDepth(10);
    this.runner.setScale(1.15);

    this.simulation = createGameSimulation({
      levelId: "signal-vault",
      levelVersion: 1,
      playerId,
      spawn: {
        x: width * 0.22,
        y: floorY,
        gravityDirection: 1
      },
      tuning: {
        tickRateHz: 60,
        runSpeed: 24,
        gravityAcceleration: 360,
        maxVerticalSpeed: 340,
        flipVelocityDamping: 0.2,
        flipCooldownMs: 140,
        respawnDelayMs: 300,
        countdownMs: 0
      }
    });
    enterMenu(this.simulation);
    beginRun(this.simulation);
    stepSimulation(this.simulation, this.simulation.fixedDeltaMs);
    setSurfaceContact(this.simulation, floorY, true);
    syncPlayerBody(this.runner, this.simulation.state.player);

    const inputController = createInputCommandController({
      bindings: defaultInputBindings,
      cooldownMs: this.simulation.tuning.flipCooldownMs,
      getClockMs: () => this.simulation?.clockMs ?? 0,
      isEnabled: () =>
        this.scene.isActive() && this.simulation?.state.phase === "RUNNING",
      dispatch: (command) => this.queuedCommands.push(command)
    });
    this.disposeInput = bindPhaserInput(
      {
        keyboard: this.input.keyboard,
        pointer: this.input
      },
      inputController
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.disposeInput?.();
      this.disposeInput = null;
      inputController.reset();
    });

    this.add
      .text(width / 2, height / 2, "INPUT ADAPTER ONLINE", {
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
        "Space · click · tap to rewrite gravity",
        {
          color: "#7995a8",
          fontFamily: "sans-serif",
          fontSize: "16px"
        }
      )
      .setOrigin(0.5);

    this.scene.launch("HudScene");
    this.emitPlayerState();
    this.bridge.emit("runtime:ready", {
      scene: "GAME",
      width,
      height
    });
  }

  override update(_time: number, delta: number): void {
    if (this.simulation === null || this.runner === null) {
      return;
    }

    const commands = this.queuedCommands;
    this.queuedCommands = [];
    stepSimulation(this.simulation, Math.min(delta, 250), commands);

    const player = this.simulation.state.player;
    if (player.gravityDirection === 1 && player.y >= floorY) {
      setSurfaceContact(this.simulation, floorY, true);
    } else if (player.gravityDirection === -1 && player.y <= ceilingY) {
      setSurfaceContact(this.simulation, ceilingY, true);
    }

    syncPlayerBody(this.runner, this.simulation.state.player);
    if (this.simulation.events.length !== this.emittedEventCount) {
      this.emittedEventCount = this.simulation.events.length;
      this.emitPlayerState();
    }
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
}
