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

test.describe("WebKit (Safari engine) on a desktop mouse", () => {
  test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });

  test("opening the menu under a resting cursor does not set the close button resizing (the open 'jump')", async ({ page }) => {
    // Safari fires hover for an element that appears under a still pointer. The close button opens
    // exactly where Menu was clicked; its old layout-animated resize looped hover on/off and made
    // Motion re-project the sheet. Its box must now hold still while the menu opens.
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      const w = window as unknown as { __closeWidths: number[] };
      w.__closeWidths = [];
      const sample = () => {
        const button = document.querySelector('[data-slot="menu-close-button"]');
        if (button) w.__closeWidths.push(Math.round(button.getBoundingClientRect().width));
        if (w.__closeWidths.length < 48) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await page.locator('[data-slot="chapter-bar"] button[aria-controls="atelier-menu-dialog"]').click();
    await page.waitForTimeout(900);
    const widths = await page.evaluate(() => (window as unknown as { __closeWidths: number[] }).__closeWidths);
    expect(widths.length).toBeGreaterThan(10);
    expect(new Set(widths)).toEqual(new Set([widths[0]]));
    await page.keyboard.press("Escape");
    await expect(page.locator("#atelier-menu-dialog")).not.toHaveAttribute("open", "", { timeout: 5000 });
  });

  test("the hero intro plays from the H.264 source", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    const intro = page.locator('video[data-slot="hero-intro-video"]');
    await expect
      .poll(() => intro.evaluate((v: HTMLVideoElement) => (v.paused ? "" : v.currentSrc)), { timeout: 8000 })
      .toMatch(/hero-monarch-intro\.mp4$/);
  });
});
