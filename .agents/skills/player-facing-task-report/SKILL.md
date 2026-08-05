---
name: player-facing-task-report
description: Summarize every completed development task or phase from the player's perspective and provide concrete, step-by-step instructions for manually testing the delivered behavior. Use after implementing or closing a task/phase, especially when a test URL, UI flow, gameplay behavior, or acceptance result needs to be handed off to a player.
---

# Player-Facing Task Report

Use this skill whenever a task or phase reaches a testable completion point.

## Completion workflow

1. Confirm what actually shipped from the diff, tests, commit, and task acceptance criteria. Do not describe planned or unverified behavior as complete.
2. Explain the result in player language: what the player can now see, do, feel, or verify. Avoid implementation terminology unless it changes the player's experience.
3. Provide a short numbered test path starting from the available test URL or launch command. Include exact controls, expected visible result, and any setup/reset step.
4. Separate automated verification from manual testing. State the relevant test command and pass/skip counts when known.
5. Call out limitations, intentional skips, known issues, or environment requirements immediately after the test steps.
6. Include the task/phase name, commit hash, and test URL when available. If a URL is unavailable, say so and provide the precise local command instead.

## Required final format

Use these sections in the final handoff, keeping them concise:

### 玩家視角

Describe the newly available experience in 2–5 sentences. Focus on user-visible behavior and why it matters during play.

### 玩家如何測試

Give numbered actions. Each action should name the control or UI element and its expected result. Include a happy path and one important edge case when the task supports it.

### 驗證與限制

List automated checks, test URL, commit, and any skips or known limitations. Never imply a skipped test passed.

## Reporting rules

- Write in the user's language when it is clear from the conversation; use Traditional Chinese for this project unless the user asks otherwise.
- Prefer observable assertions such as “畫面出現 Story result” or “按 Space 後重力顯示 UP” over code-level assertions.
- Keep the report useful to a player who has not read the implementation plan.
- If the task is not actually complete, do not use this completion format; report the blocker and the next required action instead.
