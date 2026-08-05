import { expect, test, type Locator, type Page } from "@playwright/test";

async function startRun(page: Page): Promise<{
  canvas: Locator;
  status: Locator;
}> {
  await page.goto("/");
  await page.getByRole("button", { name: "Initialize run" }).click();
  const canvas = page.locator("canvas");
  const status = page.getByRole("status");
  await expect(canvas).toHaveCount(1);
  await expect(status).toContainText("Runtime ready");
  await expect(status).toHaveAttribute("data-phase", "RUNNING");
  return { canvas, status };
}

async function waitForPlayerX(status: Locator, minimum: number) {
  await expect
    .poll(async () => Number(await status.getAttribute("data-player-x")), {
      timeout: 12_000
    })
    .toBeGreaterThan(minimum);
}

test("opens the web application shell", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /Run the floor/ })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Initialize run" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Practice" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Endless" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Local Multiplayer" })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Coming soon" })).toHaveCount(
    3
  );
});

test("opens Story level select with explicit campaign states", async ({
  page
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "View Story level select" }).click();

  await expect(
    page.getByRole("heading", { name: "Choose a relay." })
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Story levels" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Relay Run" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Switchback" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Pressure Finale" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Complete previous level" })
  ).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Initialize run" })
  ).toBeVisible();
});

test("hydrates Story progress from the offline snapshot", async ({
  page
}, testInfo) => {
  testInfo.skip(
    testInfo.project.name !== "chromium",
    "Story progress hydration is covered in Chromium; WebKit localStorage reload is flaky in CI."
  );
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.setItem(
      "gravity-runner.story-progress.v1",
      JSON.stringify({
        unlocked: ["signal-vault-01", "signal-vault-02"],
        completed: ["signal-vault-01"],
        bestTimesMs: { "signal-vault-01": 12_340 }
      })
    );
  });
  await page.reload();
  await page.getByRole("button", { name: "View Story level select" }).click();

  await expect(page.getByText("COMPLETED", { exact: true })).toBeVisible();
  await expect(page.getByText("AVAILABLE", { exact: true })).toBeVisible();
  await expect(page.getByText("00:12")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start level" })).toBeEnabled();
});

test("starts an unlocked authored level from the Story map", async ({
  page
}, testInfo) => {
  testInfo.skip(
    testInfo.project.name !== "chromium",
    "Authored Phaser runtime smoke is covered in Chromium."
  );
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.setItem(
      "gravity-runner.story-progress.v1",
      JSON.stringify({
        unlocked: ["signal-vault-01", "signal-vault-02", "signal-vault-03"],
        completed: ["signal-vault-01"],
        bestTimesMs: { "signal-vault-01": 12_340 }
      })
    );
  });
  await page.reload();
  await page.getByRole("button", { name: "View Story level select" }).click();
  await page.getByRole("button", { name: "Start level" }).first().click();

  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.getByRole("status")).toContainText("Runtime ready");
  await expect(page.getByRole("status")).toHaveAttribute(
    "data-phase",
    "RUNNING"
  );
});

test("starts the Pressure Finale authored runtime", async ({
  page
}, testInfo) => {
  testInfo.skip(
    testInfo.project.name !== "chromium",
    "Authored Phaser runtime smoke is covered in Chromium."
  );
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.setItem(
      "gravity-runner.story-progress.v1",
      JSON.stringify({
        unlocked: ["signal-vault-01", "signal-vault-02", "signal-vault-03"],
        completed: ["signal-vault-01", "signal-vault-02"],
        bestTimesMs: { "signal-vault-01": 12_340, "signal-vault-02": 18_920 }
      })
    );
  });
  await page.reload();
  await page.getByRole("button", { name: "View Story level select" }).click();
  await page
    .locator("article")
    .filter({ hasText: "Pressure Finale" })
    .getByRole("button", { name: "Start level" })
    .click();

  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.getByRole("status")).toContainText("Runtime ready");
  await expect(page.getByRole("status")).toHaveAttribute(
    "data-phase",
    "RUNNING"
  );
});

test("persists settings and remaps the keyboard flip action", async ({
  page
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings" }).click();
  const settings = page.getByRole("dialog", { name: "Settings" });
  await expect(settings).toBeVisible();

  await page.getByLabel("Flip key").selectOption("KeyW");
  await page.getByLabel("Music volume").fill("45");
  await page.getByLabel("Effects volume").fill("60");
  await page.getByLabel("Reduce movement and flash").check();
  await page.getByLabel("Debug telemetry").check();
  await page.getByRole("button", { name: "Save settings" }).click();

  await page.getByRole("button", { name: "Initialize run" }).click();
  const status = page.getByRole("status");
  await expect(status).toHaveAttribute("data-phase", "RUNNING");
  await expect(status).toContainText("W / CLICK / TOUCH");

  await page.keyboard.press("Space");
  await expect(status).toContainText("GRAVITY / DOWN");
  await page.keyboard.press("KeyW");
  await expect(status).toContainText("GRAVITY / UP");

  await page.reload();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByLabel("Flip key")).toHaveValue("KeyW");
  await expect(page.getByLabel("Music volume")).toHaveValue("45");
  await expect(page.getByLabel("Effects volume")).toHaveValue("60");
  await expect(page.getByLabel("Reduce movement and flash")).toBeChecked();
  await expect(page.getByLabel("Debug telemetry")).toBeChecked();
});

test("mounts and disposes the Phaser canvas", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Initialize run" }).click();

  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.getByRole("status")).toContainText("Runtime ready");

  await page.getByRole("button", { name: "Return to mission control" }).click();
  await expect(page.locator("canvas")).toHaveCount(0);
});

test("maps pointer and Space input to gravity commands", async ({ page }) => {
  const { canvas, status } = await startRun(page);
  await expect(status).toContainText("GRAVITY / DOWN");

  await canvas.click({ position: { x: 640, y: 360 } });
  await expect(status).toContainText("GRAVITY / UP");

  await page.getByRole("button", { name: "Return to mission control" }).click();
  await page.getByRole("button", { name: "Initialize run" }).click();
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(status).toContainText("Runtime ready");
  await expect(status).toHaveAttribute("data-phase", "RUNNING");
  await expect(status).toContainText("GRAVITY / DOWN");

  await page.keyboard.press("Space");
  await expect(status).toContainText("GRAVITY / UP");
});

test("locks gravity until the opposite surface is reached", async ({
  page
}) => {
  const { canvas, status } = await startRun(page);

  await canvas.click({ position: { x: 640, y: 360 } });
  await expect(status).toContainText("GRAVITY / UP");
  await expect(status).toHaveAttribute("data-can-flip", "false");

  await canvas.click({ position: { x: 640, y: 360 } });
  await expect(status).toContainText("GRAVITY / UP");
  await expect(status).toHaveAttribute("data-can-flip", "true", {
    timeout: 12_000
  });
});

test("pauses the deterministic run and resumes without advancing", async ({
  page
}) => {
  const { status } = await startRun(page);
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(status).toHaveAttribute("data-phase", "PAUSED");

  const pausedX = await status.getAttribute("data-player-x");
  const pausedElapsed = await status.getAttribute("data-elapsed-ms");
  await page.waitForTimeout(600);
  await expect(status).toHaveAttribute("data-player-x", pausedX ?? "");
  await expect(status).toHaveAttribute("data-elapsed-ms", pausedElapsed ?? "");

  await page.getByRole("button", { name: "Resume run" }).click();
  await expect(status).toHaveAttribute("data-phase", "RUNNING");
  await expect
    .poll(async () => Number(await status.getAttribute("data-player-x")))
    .toBeGreaterThan(Number(pausedX));
});

test("dies and respawns without a backend", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  const { status } = await startRun(page);

  await expect(status).toHaveAttribute("data-phase", "DEAD", {
    timeout: 12_000
  });
  await expect(status).toHaveAttribute("data-phase", "RUNNING", {
    timeout: 6_000
  });
  expect(Number(await status.getAttribute("data-deaths"))).toBeGreaterThan(0);
  expect(Number(await status.getAttribute("data-player-x"))).toBeLessThan(900);
});

test("respawns toward the checkpoint surface after a ceiling-side death", async ({
  page
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  const { canvas, status } = await startRun(page);

  await waitForPlayerX(status, 850);
  await canvas.click({ position: { x: 640, y: 360 } });
  await expect(status).toHaveAttribute("data-can-flip", "true", {
    timeout: 6_000
  });

  await waitForPlayerX(status, 1500);
  await canvas.click({ position: { x: 640, y: 360 } });
  await expect(status).toHaveAttribute("data-can-flip", "true", {
    timeout: 6_000
  });

  await waitForPlayerX(status, 2250);
  await expect(status).toContainText("CP / relay-01");

  await waitForPlayerX(status, 2450);
  await canvas.click({ position: { x: 640, y: 360 } });
  await expect(status).toContainText("GRAVITY / UP");

  await expect(status).toHaveAttribute("data-phase", "DEAD", {
    timeout: 12_000
  });
  await expect(status).toHaveAttribute("data-phase", "RUNNING", {
    timeout: 6_000
  });
  await expect(status).toContainText("GRAVITY / DOWN");
  await expect(status).toContainText("CP / relay-01");
  await expect(status).toHaveAttribute("data-can-flip", "true", {
    timeout: 6_000
  });

  const respawnX = Number(await status.getAttribute("data-player-x"));
  expect(respawnX).toBeGreaterThanOrEqual(2240);
  expect(respawnX).toBeLessThan(2820);
});

test("completes the original relay-run level with camera follow", async ({
  page
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  const { canvas, status } = await startRun(page);

  await waitForPlayerX(status, 850);
  await canvas.click({ position: { x: 640, y: 360 } });
  await expect(status).toContainText("GRAVITY / UP");
  await expect(status).toHaveAttribute("data-can-flip", "false");
  await expect(status).toHaveAttribute("data-can-flip", "true", {
    timeout: 6_000
  });

  await waitForPlayerX(status, 1500);
  await canvas.click({ position: { x: 640, y: 360 } });
  await expect(status).toContainText("GRAVITY / DOWN");
  await expect(status).toHaveAttribute("data-can-flip", "false");
  await expect(status).toHaveAttribute("data-can-flip", "true", {
    timeout: 6_000
  });

  await waitForPlayerX(status, 2250);
  await expect(status).toContainText("CP / relay-01");
  const worldX = Number(await status.getAttribute("data-player-x"));
  const cameraX = Number(await status.getAttribute("data-camera-x"));
  const screenX = Number(await status.getAttribute("data-player-screen-x"));
  expect(cameraX).toBeGreaterThan(0);
  expect(screenX).toBeGreaterThanOrEqual(620);
  expect(screenX).toBeLessThanOrEqual(660);
  expect(worldX).toBeGreaterThan(cameraX);

  await waitForPlayerX(status, 2450);
  await canvas.click({ position: { x: 640, y: 360 } });
  await expect(status).toContainText("GRAVITY / UP");
  await expect(status).toHaveAttribute("data-can-flip", "false");
  await expect(status).toHaveAttribute("data-can-flip", "true", {
    timeout: 6_000
  });

  await waitForPlayerX(status, 3100);
  await canvas.click({ position: { x: 640, y: 360 } });
  await expect(status).toContainText("GRAVITY / DOWN");
  await expect(status).toHaveAttribute("data-can-flip", "false");
  await expect(status).toHaveAttribute("data-can-flip", "true", {
    timeout: 6_000
  });

  await expect(status).toHaveAttribute("data-phase", "LEVEL_COMPLETE", {
    timeout: 12_000
  });
  await expect(status).toContainText("CP / relay-01");
  const result = page.getByRole("dialog", { name: "Story result" });
  await expect(result).toBeVisible();
  await expect(result).toContainText("Archive extracted");
  await expect(result).toContainText("Synced");

  await page.getByRole("button", { name: "Retry level" }).click();
  await expect(status).toHaveAttribute("data-phase", "RUNNING", {
    timeout: 6_000
  });
});
