import type {
  GameCommand,
  GameEvent,
  GameState,
  GameTuningConfig,
  GravityDirection,
  PlayerState
} from "@gravity-runner/shared-contracts";

export type SimulationPoint = {
  x: number;
  y: number;
  gravityDirection: GravityDirection;
};

export type CreateSimulationOptions = {
  levelId: string;
  levelVersion: number;
  playerId: string;
  spawn: SimulationPoint;
  tuning: GameTuningConfig;
};

export type SimulationResult = {
  state: GameState;
  events: GameEvent[];
  clockMs: number;
};

type QueuedCommand = {
  command: GameCommand;
  sequence: number;
};

export type GameSimulation = {
  state: GameState;
  readonly tuning: GameTuningConfig;
  readonly playerId: string;
  readonly fixedDeltaMs: number;
  readonly spawn: SimulationPoint;
  clockMs: number;
  accumulatorMs: number;
  phaseElapsedMs: number;
  runTicks: number;
  respawnPoint: SimulationPoint;
  lastAcceptedFlipAtMs: number | null;
  completed: boolean;
  events: GameEvent[];
  queuedCommands: QueuedCommand[];
  knownCommandKeys: Set<string>;
  nextCommandSequence: number;
};

const MAX_FRAME_DELTA_MS = 60_000;
const FLOAT_PRECISION = 1_000_000_000;

function roundFloat(value: number): number {
  return Math.round(value * FLOAT_PRECISION) / FLOAT_PRECISION;
}

function createPlayerState(
  point: SimulationPoint,
  runSpeed: number,
  checkpointId: string | null
): PlayerState {
  return {
    x: point.x,
    y: point.y,
    vx: runSpeed,
    vy: 0,
    gravityDirection: point.gravityDirection,
    isGrounded: false,
    alive: true,
    checkpointId
  };
}

export function createGameSimulation(
  options: CreateSimulationOptions
): GameSimulation {
  if (options.tuning.tickRateHz <= 0) {
    throw new RangeError("tickRateHz must be greater than zero");
  }

  const spawn = { ...options.spawn };

  return {
    state: {
      phase: "BOOT",
      levelId: options.levelId,
      levelVersion: options.levelVersion,
      elapsedMs: 0,
      deaths: 0,
      player: createPlayerState(spawn, options.tuning.runSpeed, null)
    },
    tuning: { ...options.tuning },
    playerId: options.playerId,
    fixedDeltaMs: 1000 / options.tuning.tickRateHz,
    spawn,
    clockMs: 0,
    accumulatorMs: 0,
    phaseElapsedMs: 0,
    runTicks: 0,
    respawnPoint: { ...spawn },
    lastAcceptedFlipAtMs: null,
    completed: false,
    events: [],
    queuedCommands: [],
    knownCommandKeys: new Set(),
    nextCommandSequence: 0
  };
}

export function enterMenu(simulation: GameSimulation): void {
  if (simulation.state.phase !== "BOOT") {
    return;
  }

  simulation.state.phase = "MENU";
  simulation.phaseElapsedMs = 0;
}

export function beginRun(simulation: GameSimulation): void {
  if (
    simulation.state.phase !== "MENU" &&
    simulation.state.phase !== "RESULT"
  ) {
    return;
  }

  simulation.state.phase = "COUNTDOWN";
  simulation.phaseElapsedMs = 0;
  simulation.state.elapsedMs = 0;
  simulation.runTicks = 0;
  simulation.completed = false;
  simulation.events = [];
  simulation.lastAcceptedFlipAtMs = null;
  simulation.respawnPoint = { ...simulation.spawn };
  simulation.state.player = createPlayerState(
    simulation.spawn,
    simulation.tuning.runSpeed,
    null
  );
}

function commandKey(command: GameCommand): string {
  return `${command.playerId}:${command.type}:${command.atMs}`;
}

function enqueueCommands(
  simulation: GameSimulation,
  commands: readonly GameCommand[]
): void {
  for (const command of commands) {
    const key = commandKey(command);
    if (simulation.knownCommandKeys.has(key)) {
      continue;
    }

    simulation.knownCommandKeys.add(key);
    simulation.queuedCommands.push({
      command,
      sequence: simulation.nextCommandSequence
    });
    simulation.nextCommandSequence += 1;
  }

  simulation.queuedCommands.sort(
    (left, right) =>
      left.command.atMs - right.command.atMs || left.sequence - right.sequence
  );
}

function applyFlipCommand(
  simulation: GameSimulation,
  command: GameCommand
): void {
  if (
    simulation.state.phase !== "RUNNING" ||
    command.playerId !== simulation.playerId
  ) {
    return;
  }

  const lastFlipAt = simulation.lastAcceptedFlipAtMs;
  if (
    lastFlipAt !== null &&
    command.atMs - lastFlipAt < simulation.tuning.flipCooldownMs
  ) {
    return;
  }

  const player = simulation.state.player;
  player.gravityDirection = player.gravityDirection === 1 ? -1 : 1;
  player.vy = roundFloat(player.vy * simulation.tuning.flipVelocityDamping);
  player.isGrounded = false;
  simulation.lastAcceptedFlipAtMs = command.atMs;
  simulation.events.push({
    type: "PLAYER_FLIPPED",
    atMs: command.atMs,
    playerId: command.playerId
  });
}

function processCommands(simulation: GameSimulation, tickEndMs: number): void {
  while (
    simulation.queuedCommands.length > 0 &&
    simulation.queuedCommands[0]!.command.atMs <= tickEndMs
  ) {
    const queued = simulation.queuedCommands.shift();
    if (queued !== undefined) {
      applyFlipCommand(simulation, queued.command);
    }
  }
}

function updateRunningPhysics(simulation: GameSimulation): void {
  const deltaSeconds = simulation.fixedDeltaMs / 1000;
  const player = simulation.state.player;
  const acceleration =
    simulation.tuning.gravityAcceleration * player.gravityDirection;

  player.vx = simulation.tuning.runSpeed;
  player.vy = Math.max(
    -simulation.tuning.maxVerticalSpeed,
    Math.min(
      simulation.tuning.maxVerticalSpeed,
      player.vy + acceleration * deltaSeconds
    )
  );
  player.x = roundFloat(player.x + player.vx * deltaSeconds);
  player.y = roundFloat(player.y + player.vy * deltaSeconds);

  simulation.runTicks += 1;
  simulation.state.elapsedMs = Math.round(
    simulation.runTicks * simulation.fixedDeltaMs
  );
}

function respawnPlayer(simulation: GameSimulation): void {
  const checkpointId = simulation.state.player.checkpointId;
  simulation.state.player = createPlayerState(
    simulation.respawnPoint,
    simulation.tuning.runSpeed,
    checkpointId
  );
  simulation.state.phase = "CHECKPOINT_RESPAWN";
  simulation.phaseElapsedMs = 0;
}

function fixedStep(simulation: GameSimulation): void {
  const tickEndMs = simulation.clockMs + simulation.fixedDeltaMs;
  processCommands(simulation, tickEndMs);

  switch (simulation.state.phase) {
    case "COUNTDOWN":
      simulation.phaseElapsedMs += simulation.fixedDeltaMs;
      if (simulation.phaseElapsedMs >= simulation.tuning.countdownMs) {
        simulation.state.phase = "RUNNING";
        simulation.phaseElapsedMs = 0;
      }
      break;
    case "RUNNING":
      updateRunningPhysics(simulation);
      break;
    case "DEAD":
      simulation.phaseElapsedMs += simulation.fixedDeltaMs;
      if (simulation.phaseElapsedMs >= simulation.tuning.respawnDelayMs) {
        respawnPlayer(simulation);
      }
      break;
    case "CHECKPOINT_RESPAWN":
      simulation.state.phase = "COUNTDOWN";
      simulation.phaseElapsedMs = 0;
      break;
    default:
      break;
  }

  simulation.clockMs = roundFloat(tickEndMs);
}

export function stepSimulation(
  simulation: GameSimulation,
  deltaMs: number,
  commands: readonly GameCommand[] = []
): SimulationResult {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new RangeError("deltaMs must be a finite non-negative number");
  }
  if (deltaMs > MAX_FRAME_DELTA_MS) {
    throw new RangeError(`deltaMs must not exceed ${MAX_FRAME_DELTA_MS}`);
  }

  enqueueCommands(simulation, commands);
  simulation.accumulatorMs += deltaMs;

  while (simulation.accumulatorMs >= simulation.fixedDeltaMs) {
    fixedStep(simulation);
    simulation.accumulatorMs = roundFloat(
      simulation.accumulatorMs - simulation.fixedDeltaMs
    );
  }

  return getSimulationResult(simulation);
}

export function reachCheckpoint(
  simulation: GameSimulation,
  checkpoint: { id: string; x: number; y: number; atMs: number }
): void {
  if (
    simulation.state.phase !== "RUNNING" ||
    checkpoint.x < simulation.respawnPoint.x ||
    simulation.state.player.checkpointId === checkpoint.id
  ) {
    return;
  }

  simulation.respawnPoint = {
    x: checkpoint.x,
    y: checkpoint.y,
    gravityDirection: simulation.state.player.gravityDirection
  };
  simulation.state.player.checkpointId = checkpoint.id;
  simulation.events.push({
    type: "CHECKPOINT_REACHED",
    atMs: checkpoint.atMs,
    checkpointId: checkpoint.id
  });
}

export function killPlayer(
  simulation: GameSimulation,
  cause: string,
  atMs: number
): void {
  if (simulation.state.phase !== "RUNNING" || !simulation.state.player.alive) {
    return;
  }

  simulation.state.player.alive = false;
  simulation.state.phase = "DEAD";
  simulation.state.deaths += 1;
  simulation.phaseElapsedMs = 0;
  simulation.events.push({ type: "PLAYER_DIED", atMs, cause });
}

export function completeLevel(simulation: GameSimulation, atMs: number): void {
  if (simulation.state.phase !== "RUNNING" || simulation.completed) {
    return;
  }

  simulation.completed = true;
  simulation.state.phase = "LEVEL_COMPLETE";
  simulation.events.push({
    type: "LEVEL_COMPLETED",
    atMs,
    durationMs: simulation.state.elapsedMs
  });
}

export function showResult(simulation: GameSimulation): void {
  if (simulation.state.phase === "LEVEL_COMPLETE") {
    simulation.state.phase = "RESULT";
    simulation.phaseElapsedMs = 0;
  }
}

export function setSurfaceContact(
  simulation: GameSimulation,
  y: number,
  grounded: boolean
): void {
  if (simulation.state.phase !== "RUNNING") {
    return;
  }

  simulation.state.player.y = y;
  simulation.state.player.isGrounded = grounded;
  if (grounded) {
    simulation.state.player.vy = 0;
  }
}

export function getSimulationResult(
  simulation: GameSimulation
): SimulationResult {
  return {
    state: {
      ...simulation.state,
      player: { ...simulation.state.player }
    },
    events: simulation.events.map(cloneGameEvent),
    clockMs: simulation.clockMs
  };
}

function cloneGameEvent(event: GameEvent): GameEvent {
  switch (event.type) {
    case "PLAYER_FLIPPED":
      return { ...event };
    case "CHECKPOINT_REACHED":
      return { ...event };
    case "PLAYER_DIED":
      return { ...event };
    case "LEVEL_COMPLETED":
      return { ...event };
  }
}
