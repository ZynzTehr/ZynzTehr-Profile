import { expect, test } from "@playwright/test";

/**
 * Safari-engine checks (project "webkit-ipad", iPad gen 7 portrait 810x1080, touch).
 * Runs only where WebKit is installed; see playwright.config.ts.
 */
test.describe("WebKit (Safari engine) on iPad portrait", () => {
  test("the hero plate keeps its cotton-rag mat on all four sides", async ({ page }) => {
    // WebKit resolved h-full against the aspect-ratio box and pushed the image over the bottom mat
    await page.goto("/", { waitUntil: "load" });
    await page.waitForTimeout(800);
    const insets = await page.evaluate(() => {
      const frame = document.querySelector('[data-act="00-hero"] [data-slot="monarch-plate-frame"]');
      const img = frame?.querySelector("img");
      if (!frame || !img) return null;
      const f = frame.getBoundingClientRect();
      const i = img.getBoundingClientRect();
      return [i.top - f.top, f.right - i.right, f.bottom - i.bottom, i.left - f.left];
    });
    expect(insets).not.toBeNull();
    for (const inset of insets!) expect(inset).toBeGreaterThanOrEqual(6);
  });

  test("the espresso Journey sheet slides over the hero and the chapter label follows", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    await page.waitForTimeout(800);
    const journeyTop = await page.evaluate(
      () => document.querySelector('[data-act="01-journey"]')!.getBoundingClientRect().top + window.scrollY,
    );
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(journeyTop));
    await expect
      .poll(() =>
        page.locator("[data-mobile-recede]").evaluate((el) => Number.parseFloat(getComputedStyle(el).opacity)),
      )
      .toBeLessThan(0.18);
    await expect(page.locator('[data-slot="chapter-bar"]')).toContainText("I · My Journey");
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator('[data-slot="chapter-bar"]')).toContainText("Menifee, Southern California");
  });
});
