# Game core

`@gravity-runner/game-core` owns deterministic, framework-free gameplay rules.
It has no rendering, browser, server, filesystem, or network dependencies.

The simulation advances only through a fixed timestep. Rendering code may call
`stepSimulation` with arbitrary frame deltas; the same tuning and timestamped
commands produce the same state and event order.

Main APIs:

- `createGameSimulation`, `enterMenu`, `beginRun`, `stepSimulation`
- `reachCheckpoint`, `killPlayer`, `completeLevel`, `showResult`
- `setSurfaceContact` for collision adapters
- `getSimulationResult` for replay and test snapshots

Collision detection remains outside this package. Phaser adapters report
surface contacts, checkpoints, hazards, and finish triggers through the domain
APIs above.
