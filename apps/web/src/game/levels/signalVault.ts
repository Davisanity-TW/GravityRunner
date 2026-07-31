import type { LevelManifest } from "@gravity-runner/shared-contracts";

export const signalVaultLevel = {
  id: "signal-vault",
  version: 1,
  name: "Signal Vault: Relay Run",
  theme: "neon-archive",
  width: 3900,
  height: 720,
  runSpeed: 240,
  spawn: { x: 640, y: 624, gravityDirection: 1 },
  finish: { x: 3740, y: 72, width: 64, height: 576 },
  checkpoints: [{ id: "relay-01", x: 2240, y: 624 }],
  platforms: [
    { id: "floor-opening", x: 0, y: 648, width: 1420, height: 72 },
    { id: "ceiling-switchback", x: 780, y: 0, width: 1380, height: 72 },
    { id: "floor-relay", x: 1680, y: 648, width: 1140, height: 72 },
    { id: "ceiling-gap-bridge", x: 2560, y: 0, width: 820, height: 72 },
    { id: "floor-finish", x: 3100, y: 648, width: 800, height: 72 }
  ],
  hazards: [
    {
      id: "opening-spikes",
      type: "spikes",
      x: 1120,
      y: 600,
      width: 72,
      height: 48
    }
  ]
} as const satisfies LevelManifest;
