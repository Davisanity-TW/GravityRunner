export type StoryLevelId =
  "signal-vault-01" | "signal-vault-02" | "signal-vault-03";

export type StoryLevelDefinition = {
  id: StoryLevelId;
  code: string;
  title: string;
  subtitle: string;
  description: string;
  runtimeAvailable: boolean;
};

export type StoryLevelStatus = "locked" | "available" | "completed";

export type StoryProgress = {
  unlocked: StoryLevelId[];
  completed: StoryLevelId[];
  bestTimesMs: Partial<Record<StoryLevelId, number>>;
};

export const storyLevels: readonly StoryLevelDefinition[] = [
  {
    id: "signal-vault-01",
    code: "SV-01",
    title: "Relay Run",
    subtitle: "Signal Vault",
    description: "Learn the one-flip rhythm, sync the relay and extract.",
    runtimeAvailable: true
  },
  {
    id: "signal-vault-02",
    code: "SV-02",
    title: "Switchback",
    subtitle: "Teaching Mastery",
    description: "A denser alternating route teaches the switchback rhythm.",
    runtimeAvailable: true
  },
  {
    id: "signal-vault-03",
    code: "SV-03",
    title: "Pressure Finale",
    subtitle: "Archive Core",
    description: "A violet finale combines every mastered surface pattern.",
    runtimeAvailable: true
  }
];

const storageKey = "gravity-runner.story-progress.v1";

export const defaultStoryProgress: StoryProgress = {
  unlocked: ["signal-vault-01"],
  completed: [],
  bestTimesMs: {}
};

function isStoryLevelId(value: unknown): value is StoryLevelId {
  return (
    value === "signal-vault-01" ||
    value === "signal-vault-02" ||
    value === "signal-vault-03"
  );
}

function sanitizeProgress(value: unknown): StoryProgress {
  if (typeof value !== "object" || value === null) {
    return { ...defaultStoryProgress };
  }

  const candidate = value as Partial<StoryProgress>;
  const unlocked = Array.isArray(candidate.unlocked)
    ? candidate.unlocked.filter(isStoryLevelId)
    : [];
  const completed = Array.isArray(candidate.completed)
    ? candidate.completed.filter(isStoryLevelId)
    : [];
  const bestTimesMs: Partial<Record<StoryLevelId, number>> = {};
  if (
    typeof candidate.bestTimesMs === "object" &&
    candidate.bestTimesMs !== null
  ) {
    for (const level of storyLevels) {
      const valueForLevel = candidate.bestTimesMs[level.id];
      if (typeof valueForLevel === "number" && Number.isFinite(valueForLevel)) {
        bestTimesMs[level.id] = Math.max(0, Math.round(valueForLevel));
      }
    }
  }

  return {
    unlocked: Array.from(new Set(["signal-vault-01", ...unlocked])),
    completed: Array.from(new Set(completed)),
    bestTimesMs
  };
}

export function loadStoryProgress(): StoryProgress {
  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored === null
      ? {
          ...defaultStoryProgress,
          unlocked: [...defaultStoryProgress.unlocked]
        }
      : sanitizeProgress(JSON.parse(stored));
  } catch {
    return {
      ...defaultStoryProgress,
      unlocked: [...defaultStoryProgress.unlocked]
    };
  }
}

export function saveStoryProgress(progress: StoryProgress): void {
  window.localStorage.setItem(storageKey, JSON.stringify(progress));
}

export function getStoryLevelStatus(
  progress: StoryProgress,
  levelId: StoryLevelId
): StoryLevelStatus {
  if (progress.completed.includes(levelId)) {
    return "completed";
  }
  return progress.unlocked.includes(levelId) ? "available" : "locked";
}

export function completeStoryLevel(
  progress: StoryProgress,
  levelId: StoryLevelId,
  elapsedMs: number
): StoryProgress {
  const index = storyLevels.findIndex((level) => level.id === levelId);
  const nextLevel = index >= 0 ? storyLevels[index + 1] : undefined;
  const previousBest = progress.bestTimesMs[levelId];
  const bestTimesMs = {
    ...progress.bestTimesMs,
    [levelId]:
      previousBest === undefined
        ? Math.max(0, Math.round(elapsedMs))
        : Math.min(previousBest, Math.max(0, Math.round(elapsedMs)))
  };
  return {
    unlocked: Array.from(
      new Set([
        ...progress.unlocked,
        levelId,
        ...(nextLevel === undefined ? [] : [nextLevel.id])
      ])
    ),
    completed: Array.from(new Set([...progress.completed, levelId])),
    bestTimesMs
  };
}

export function formatBestTime(elapsedMs: number | undefined): string {
  if (elapsedMs === undefined) {
    return "—";
  }
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}
