import { expect, test } from "@playwright/test";

test("opens the web application shell", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Gravity Switch Runner" })
  ).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Web shell ready");
});
