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
      timeout: 8_000
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
    timeout: 3_000
  });
});

test("dies and respawns without a backend", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  const { status } = await startRun(page);

  await expect(status).toHaveAttribute("data-phase", "DEAD", {
    timeout: 7_000
  });
  await expect(status).toHaveAttribute("data-phase", "RUNNING", {
    timeout: 3_000
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
    timeout: 3_000
  });

  await waitForPlayerX(status, 1500);
  await canvas.click({ position: { x: 640, y: 360 } });
  await expect(status).toHaveAttribute("data-can-flip", "true", {
    timeout: 3_000
  });

  await waitForPlayerX(status, 2250);
  await expect(status).toContainText("CP / relay-01");

  await waitForPlayerX(status, 2450);
  await canvas.click({ position: { x: 640, y: 360 } });
  await expect(status).toContainText("GRAVITY / UP");

  await expect(status).toHaveAttribute("data-phase", "DEAD", {
    timeout: 7_000
  });
  await expect(status).toHaveAttribute("data-phase", "RUNNING", {
    timeout: 3_000
  });
  await expect(status).toContainText("GRAVITY / DOWN");
  await expect(status).toContainText("CP / relay-01");
  await expect(status).toHaveAttribute("data-can-flip", "true", {
    timeout: 2_000
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
    timeout: 3_000
  });

  await waitForPlayerX(status, 1500);
  await canvas.click({ position: { x: 640, y: 360 } });
  await expect(status).toContainText("GRAVITY / DOWN");
  await expect(status).toHaveAttribute("data-can-flip", "false");
  await expect(status).toHaveAttribute("data-can-flip", "true", {
    timeout: 3_000
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
    timeout: 3_000
  });

  await waitForPlayerX(status, 3100);
  await canvas.click({ position: { x: 640, y: 360 } });
  await expect(status).toContainText("GRAVITY / DOWN");
  await expect(status).toHaveAttribute("data-can-flip", "false");
  await expect(status).toHaveAttribute("data-can-flip", "true", {
    timeout: 3_000
  });

  await expect(status).toHaveAttribute("data-phase", "LEVEL_COMPLETE", {
    timeout: 5_000
  });
  await expect(status).toContainText("CP / relay-01");
});
