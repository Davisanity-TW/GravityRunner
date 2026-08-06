import type { LevelManifest } from "@gravity-runner/shared-contracts";

import { signalVaultLevel } from "./signalVault.js";

export const signalSwitchbackLevel = {
  id: "signal-vault-02",
  version: 1,
  name: "Signal Vault: Switchback",
  theme: "amber-switchback",
  width: 4600,
  height: 720,
  runSpeed: 240,
  spawn: { x: 520, y: 624, gravityDirection: 1 },
  finish: { x: 4470, y: 72, width: 64, height: 576 },
  checkpoints: [
    { id: "switchback-01", x: 2200, y: 624, gravityDirection: 1 },
    { id: "switchback-02", x: 3600, y: 96, gravityDirection: -1 }
  ],
  platforms: [
    { id: "switchback-floor-opening", x: 0, y: 648, width: 1100, height: 72 },
    { id: "switchback-ceiling-intro", x: 760, y: 0, width: 1780, height: 72 },
    { id: "switchback-floor-turn", x: 1420, y: 648, width: 1000, height: 72 },
    { id: "switchback-ceiling-bridge", x: 2050, y: 0, width: 1200, height: 72 },
    {
      id: "switchback-floor-mastery",
      x: 2700,
      y: 648,
      width: 1000,
      height: 72
    },
    { id: "switchback-ceiling-exit", x: 3250, y: 0, width: 1050, height: 72 },
    { id: "switchback-floor-landing", x: 4000, y: 648, width: 600, height: 72 }
  ],
  hazards: [
    {
      id: "switchback-opening-spikes",
      type: "spikes",
      x: 700,
      y: 600,
      width: 72,
      height: 48
    },
    {
      id: "switchback-ceiling-pulse",
      type: "electric",
      x: 1540,
      y: 72,
      width: 96,
      height: 48
    },
    {
      id: "switchback-floor-teeth",
      type: "spikes",
      x: 2920,
      y: 600,
      width: 96,
      height: 48
    },
    {
      id: "switchback-ceiling-pulse-2",
      type: "electric",
      x: 3820,
      y: 72,
      width: 96,
      height: 48
    }
  ]
} as const satisfies LevelManifest;

export const signalPressureLevel = {
  id: "signal-vault-03",
  version: 1,
  name: "Signal Vault: Pressure Line",
  theme: "violet-pressure-line",
  width: 5200,
  height: 720,
  runSpeed: 250,
  spawn: { x: 480, y: 624, gravityDirection: 1 },
  finish: { x: 5060, y: 72, width: 72, height: 576 },
  checkpoints: [
    { id: "pressure-01", x: 2300, y: 624, gravityDirection: 1 },
    { id: "pressure-02", x: 4050, y: 96, gravityDirection: -1 }
  ],
  platforms: [
    {
      id: "pressure-floor-safety-runway",
      x: 0,
      y: 648,
      width: 5200,
      height: 72
    },
    { id: "pressure-floor-opening", x: 0, y: 648, width: 1200, height: 72 },
    { id: "pressure-ceiling-rise", x: 820, y: 0, width: 1500, height: 72 },
    { id: "pressure-floor-crossing", x: 1200, y: 648, width: 1800, height: 72 },
    { id: "pressure-ceiling-arc", x: 2600, y: 0, width: 1700, height: 72 },
    { id: "pressure-floor-finale", x: 3000, y: 648, width: 1450, height: 72 },
    { id: "pressure-ceiling-finish", x: 4200, y: 0, width: 1000, height: 72 }
  ],
  hazards: [
    {
      id: "pressure-opening-spikes",
      type: "spikes",
      x: 860,
      y: 600,
      width: 96,
      height: 48
    },
    {
      id: "pressure-ceiling-pulse",
      type: "electric",
      x: 1450,
      y: 72,
      width: 104,
      height: 48
    },
    {
      id: "pressure-floor-pulse",
      type: "electric",
      x: 2050,
      y: 600,
      width: 104,
      height: 48
    },
    {
      id: "pressure-ceiling-teeth",
      type: "spikes",
      x: 3150,
      y: 72,
      width: 104,
      height: 48
    },
    {
      id: "pressure-finale-spikes",
      type: "spikes",
      x: 3700,
      y: 600,
      width: 104,
      height: 48
    },
    {
      id: "pressure-finish-pulse",
      type: "electric",
      x: 4300,
      y: 600,
      width: 104,
      height: 48
    }
  ],
  boostZones: [
    {
      id: "pressure-boost-floor",
      x: 1320,
      y: 600,
      width: 180,
      height: 48,
      durationMs: 2000,
      multiplier: 1.25
    },
    {
      id: "pressure-boost-ceiling",
      x: 3920,
      y: 72,
      width: 180,
      height: 48,
      durationMs: 2000,
      multiplier: 1.25
    }
  ]
} as const satisfies LevelManifest;

export const storyLevelManifests = {
  "signal-vault-01": signalVaultLevel,
  "signal-vault-02": signalSwitchbackLevel,
  "signal-vault-03": signalPressureLevel
} as const;

export type StoryRuntimeLevelId = keyof typeof storyLevelManifests;

export function getStoryLevelManifest(
  levelId: StoryRuntimeLevelId
): LevelManifest {
  return storyLevelManifests[levelId];
}
