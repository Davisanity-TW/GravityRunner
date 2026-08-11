---
name: notion-game-parameter-sync
description: Synchronize Gravity Runner gameplay tuning from the Notion Gameplay Parameters Registry into packages/config/src/index.ts and the game, whenever a user changes or asks about player speed, pursuer speed, acceleration, max speed, checkpoints, or terrain-generation parameters.
---

# Notion Game Parameter Sync

Use this skill whenever the user asks to sync, change, or inspect gameplay parameters recorded in the Notion page `Gravity Runner｜Gameplay Parameters Registry`.

## Source of truth

- Fetch the registry page before changing code: `3b94461a-a44e-8130-a92f-c24049aa1390`.
- Treat the numeric value beside each stable parameter key as authoritative. Do not infer a value from prose when the key/value entry is present.
- If a key is missing, malformed, negative where the game requires positive values, or duplicated, stop and report the exact issue instead of guessing.

## Sync procedure

1. Fetch the Notion page and read all parameter tables.
2. Map keys to `packages/config/src/index.ts`:
   - `player.*` → `gameplayParameters.player`
   - `pursuer.*` → `gameplayParameters.pursuer`
   - `terrain.*` → `gameplayParameters.terrain`
   - `endless.*` → `gameplayParameters.endless`
3. Update only the numeric values in that exported object. Keep the parameter names and units stable.
4. Confirm consumers use `gameplayParameters` instead of duplicated literals. Story level `runSpeed` overrides remain authored level data unless the Notion page explicitly adds a level-specific key.
5. Run `pnpm test`, `pnpm typecheck`, and `pnpm build` (or the smallest relevant package checks while iterating).
6. If checks pass, update the Notion page's `Last synced commit` line with the new commit hash, then create one git commit for the sync. Never commit a partial or failing sync.
7. Report changed keys, validation results, commit hash, and the local test URL `http://127.0.0.1:4173/` when the web app is available.

## Safety rules

- Do not change level geometry or gameplay formulas as a side effect of a parameter sync.
- Do not overwrite a user change in Notion with repository values. If the page and code differ, the page wins.
- Preserve the pursuer's runtime speed across respawn; only its configured initial/acceleration/cap values come from this registry.
- For terrain values, regenerate deterministic Endless geometry and rerun the level tests before committing.

## Player-facing handoff

After completing a sync, explain from the player's perspective what feels different and give concrete steps to test it in Story Level 3 and Endless mode. Include any parameter that was intentionally unchanged because it is an authored level override.
