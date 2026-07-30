import { expect, test } from "@playwright/test";

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
  await page.goto("/");
  await page.getByRole("button", { name: "Initialize run" }).click();

  const canvas = page.locator("canvas");
  const status = page.getByRole("status");
  await expect(canvas).toHaveCount(1);
  await expect(status).toContainText("Runtime ready");
  await expect(status).toContainText("GRAVITY / DOWN");

  await canvas.click({ position: { x: 640, y: 360 } });
  await expect(status).toContainText("GRAVITY / UP");

  await page.getByRole("button", { name: "Return to mission control" }).click();
  await page.getByRole("button", { name: "Initialize run" }).click();
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(status).toContainText("Runtime ready");
  await expect(status).toContainText("GRAVITY / DOWN");

  await page.keyboard.press("Space");
  await expect(status).toContainText("GRAVITY / UP");
});
