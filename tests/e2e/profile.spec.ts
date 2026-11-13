import fs from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const CONTACT_EMAIL = "jorgeforwork88@gmail.com";
const PORTFOLIO_URL = "https://work.jorgebucio.com/";
const GITHUB_URL = "https://github.com/ZynzTehr";
const GITHUB_REPOS_URL = "https://github.com/ZynzTehr?tab=repositories";
const LINKEDIN_URL = "https://www.linkedin.com/in/jorge-bucio-876738393/";

const TEN_CONTRIB_SVGS = [
  "profile-3d-contrib/profile-night-rainbow.svg",
  "profile-3d-contrib/profile-night-view.svg",
  "profile-3d-contrib/profile-night-green.svg",
  "profile-3d-contrib/profile-season-animate.svg",
  "profile-3d-contrib/profile-season.svg",
  "profile-3d-contrib/profile-south-season-animate.svg",
  "profile-3d-contrib/profile-south-season.svg",
  "profile-3d-contrib/profile-green-animate.svg",
  "profile-3d-contrib/profile-green.svg",
  "profile-3d-contrib/profile-gitblock.svg",
] as const;

const SHOT_DIR = process.env.E2E_SHOT_DIR ?? "";

async function maybeCapture(page: Page, filename: string): Promise<void> {
  if (!SHOT_DIR) return;
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(SHOT_DIR, filename) });
}

interface PageErrorTracker {
  assertClean: () => void;
}

function trackPageDiagnostics(page: Page): PageErrorTracker {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const badResponses: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });
  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });
  page.on("response", (res) => {
    if (res.status() >= 400) {
      badResponses.push(`${res.status()} ${res.url()}`);
    }
  });

  return {
    assertClean: () => {
      expect(consoleErrors, "Unexpected browser console.error logs").toEqual([]);
      expect(pageErrors, "Unexpected uncaught page errors").toEqual([]);
      expect(badResponses, "Unexpected HTTP >= 400 responses").toEqual([]);
    },
  };
}

async function assertZeroAxeViolations(page: Page, contextLabel: string): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const severe = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  expect(severe, `Critical/serious Axe violations at ${contextLabel}`).toEqual([]);
  expect(results.violations, `All Axe violations at ${contextLabel}`).toEqual([]);
}

async function scrollToYAndFlushScrub(page: Page, targetY: number): Promise<void> {
  await page.evaluate((y) => {
    if (window.lenis) {
      window.lenis.scrollTo(y, { immediate: true, force: true });
    } else {
      window.scrollTo(0, y);
    }
    window.ScrollTrigger?.update();
    window.ScrollTrigger?.getAll().forEach((st) => {
      const tween = st.getTween?.();
      if (tween && typeof tween.progress === "function") {
        tween.progress(1);
      }
      if (!st.vars?.scrub && st.progress > 0 && st.animation && typeof st.animation.progress === "function") {
        st.animation.progress(1);
      }
    });
  }, targetY);
  await page.waitForTimeout(140);
}

async function waitForDialogSettled(page: Page, dialogSelector: string): Promise<void> {
  await expect(page.locator(dialogSelector)).toHaveAttribute("open", "");
  await expect
    .poll(
      async () =>
        page.evaluate((sel) => {
          const dialog = document.querySelector<HTMLDialogElement>(sel);
          if (!dialog || !dialog.open) return false;
          const sheet = dialog.querySelector<HTMLElement>(
            '[data-slot="menu-sheet"], [data-slot="colophon-panel"]',
          );
          if (!sheet) return false;
          const sr = sheet.getBoundingClientRect();
          if (
            sr.width < 200 ||
            sr.left < -1.5 ||
            sr.right > window.innerWidth + 1.5 ||
            sr.bottom > window.innerHeight + 1.5
          ) {
            return false;
          }
          const descendants = Array.from(dialog.querySelectorAll<HTMLElement>("*"));
          if (descendants.length === 0) return false;
          for (const el of descendants) {
            const cs = window.getComputedStyle(el);
            if (cs.display === "none" || cs.visibility === "hidden") continue;
            if (Number(cs.opacity) < 0.999) return false;
          }
          return true;
        }, dialogSelector),
      { timeout: 6000 },
    )
    .toBe(true);
  await page.waitForTimeout(80);
}

async function scrollToStageProgress(page: Page, targetProgress: number): Promise<void> {
  const targetY = await page.evaluate((p) => {
    const st = window.ScrollTrigger?.getById("hero-journey-pin");
    if (!st) throw new Error("hero-journey-pin ScrollTrigger not found");
    return Math.round(st.start + (st.end - st.start) * p);
  }, targetProgress);
  await scrollToYAndFlushScrub(page, targetY);
}

async function settleHeroOpening(page: Page): Promise<void> {
  await page.evaluate(() => {
    const introVid = document.querySelector<HTMLVideoElement>('video[data-slot="hero-intro-video"]');
    if (introVid && !introVid.ended) {
      if (Number.isFinite(introVid.duration) && introVid.duration > 0.25) {
        introVid.currentTime = introVid.duration - 0.08;
      } else {
        introVid.dispatchEvent(new Event("ended"));
      }
    }
  });
  await expect(page.locator('[data-slot="hero-role-rule"]')).toHaveCSS("opacity", "1", {
    timeout: 8000,
  });
  await page.waitForTimeout(250);
}

async function swipeRight(context: BrowserContext, page: Page, fromX: number, y: number, distance: number) {
  const touch = await context.newCDPSession(page);
  await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: fromX, y }] });
  for (let step = 1; step <= 12; step += 1) {
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: fromX + (distance * step) / 12, y }],
    });
    await page.waitForTimeout(16);
  }
  await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

async function heroMatInsets(page: Page): Promise<number[] | null> {
  return page.evaluate(() => {
    const frame = document.querySelector('[data-act="00-hero"] [data-slot="monarch-plate-frame"]');
    const img = frame?.querySelector("img");
    if (!frame || !img) return null;
    const f = frame.getBoundingClientRect();
    const i = img.getBoundingClientRect();
    return [i.top - f.top, f.right - i.right, f.bottom - i.bottom, i.left - f.left];
  });
}

async function findOverlappingVisibleText(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const BLOCK_TAGS = new Set([
      "H1",
      "H2",
      "H3",
      "H4",
      "H5",
      "H6",
      "P",
      "BUTTON",
      "A",
      "LI",
      "DT",
      "DD",
      "FIGCAPTION",
    ]);
    const FLEX_OR_GRID = new Set(["flex", "inline-flex", "grid", "inline-grid"]);

    function getEffectiveVisibility(el: HTMLElement): { visible: boolean; opacity: number } {
      let opacity = 1;
      let cur: HTMLElement | null = el;
      while (cur && cur !== document.documentElement) {
        if (cur.classList.contains("sr-only")) return { visible: false, opacity: 0 };
        if (cur.tagName === "DIALOG" && !(cur as HTMLDialogElement).open) {
          return { visible: false, opacity: 0 };
        }
        const cs = window.getComputedStyle(cur);
        if (cs.display === "none" || cs.visibility === "hidden") {
          return { visible: false, opacity: 0 };
        }
        const op = Number.parseFloat(cs.opacity);
        if (Number.isFinite(op)) {
          opacity *= op;
        }
        if (opacity < 0.18) {
          return { visible: false, opacity };
        }
        if (
          (cs.overflow === "hidden" || cs.overflowY === "hidden" || cs.overflowX === "hidden") &&
          cur !== document.body
        ) {
          const clipRect = cur.getBoundingClientRect();
          if (clipRect.width < 2 || clipRect.height < 2) {
            return { visible: false, opacity: 0 };
          }
        }
        cur = cur.parentElement;
      }
      return { visible: opacity >= 0.18, opacity };
    }

    function findSemanticOwner(el: HTMLElement): HTMLElement {
      let cur: HTMLElement = el;
      while (cur.parentElement && cur.parentElement !== document.body) {
        if (BLOCK_TAGS.has(cur.tagName)) return cur;
        const cs = window.getComputedStyle(cur);
        if (cs.position === "absolute" || cs.position === "fixed") {
          return cur;
        }
        const parentDisplay = window.getComputedStyle(cur.parentElement).display;
        if (FLEX_OR_GRID.has(parentDisplay)) {
          return cur;
        }
        cur = cur.parentElement;
      }
      return cur;
    }

    const openDialog = document.querySelector<HTMLDialogElement>("dialog[open]");
    const connectSection = document.getElementById("connect");
    const connectSlideOverTop =
      !openDialog && connectSection?.getAttribute("data-slide-over") === "true"
        ? connectSection.getBoundingClientRect().top
        : Number.POSITIVE_INFINITY;

    const groupedNodes = new Map<HTMLElement, Text[]>();
    const walker = document.createTreeWalker(
      openDialog ?? document.body,
      NodeFilter.SHOW_TEXT,
    );

    let currentNode = walker.nextNode();
    while (currentNode) {
      const textNode = currentNode as Text;
      const raw = textNode.textContent?.trim() ?? "";
      const parent = textNode.parentElement;
      currentNode = walker.nextNode();
      if (!raw || !parent) continue;

      if (!getEffectiveVisibility(parent).visible) continue;
      const owner = findSemanticOwner(parent);
      if (!getEffectiveVisibility(owner).visible) continue;

      const list = groupedNodes.get(owner);
      if (list) {
        list.push(textNode);
      } else {
        groupedNodes.set(owner, [textNode]);
      }
    }

    const candidates: Array<{
      owner: HTMLElement;
      text: string;
      rect: { left: number; top: number; right: number; bottom: number };
    }> = [];

    const range = document.createRange();
    for (const [owner, textNodes] of groupedNodes.entries()) {
      let left = Number.POSITIVE_INFINITY;
      let top = Number.POSITIVE_INFINITY;
      let right = Number.NEGATIVE_INFINITY;
      let bottom = Number.NEGATIVE_INFINITY;
      const words: string[] = [];

      for (const tn of textNodes) {
        words.push((tn.textContent ?? "").trim());
        range.selectNodeContents(tn);
        for (const cr of Array.from(range.getClientRects())) {
          if (cr.width < 0.5 || cr.height < 0.5) continue;
          if (cr.left < left) left = cr.left;
          if (cr.top < top) top = cr.top;
          if (cr.right > right) right = cr.right;
          if (cr.bottom > bottom) bottom = cr.bottom;
        }
      }

      if (!Number.isFinite(left) || right - left < 2 || bottom - top < 2) continue;

      let effectiveBottom = bottom;
      if (
        connectSection &&
        !connectSection.contains(owner) &&
        !owner.closest('[data-slot="chapter-bar"]') &&
        connectSlideOverTop < window.innerHeight
      ) {
        effectiveBottom = Math.min(effectiveBottom, connectSlideOverTop);
      }

      const clippedTop = Math.max(0, top);
      const clippedBottom = Math.min(window.innerHeight, effectiveBottom);
      const clippedLeft = Math.max(0, left);
      const clippedRight = Math.min(window.innerWidth, right);
      if (clippedBottom - clippedTop < 2 || clippedRight - clippedLeft < 2) continue;

      candidates.push({
        owner,
        text: words.join(" ").replace(/\s+/g, " ").trim().slice(0, 48),
        rect: {
          left: clippedLeft,
          top: clippedTop,
          right: clippedRight,
          bottom: clippedBottom,
        },
      });
    }

    const collisions: string[] = [];
    for (let i = 0; i < candidates.length; i += 1) {
      for (let j = i + 1; j < candidates.length; j += 1) {
        const a = candidates[i]!;
        const b = candidates[j]!;

        const ix = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left);
        const iy = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top);
        // Allow up to 4px line-box subpixel ascent/descent kerf on display leading
        if (ix > 4 && iy > 4) {
          collisions.push(
            `"${a.text}" [${Math.round(a.rect.left)},${Math.round(a.rect.top)}..${Math.round(a.rect.right)},${Math.round(a.rect.bottom)}] overlaps "${b.text}" [${Math.round(b.rect.left)},${Math.round(b.rect.top)}..${Math.round(b.rect.right)},${Math.round(b.rect.bottom)}]`,
          );
        }
      }
    }

    return collisions;
  });
}

async function findFontFloorViolations(page: Page, minPx = 14): Promise<string[]> {
  return page.evaluate((floorPx) => {
    const violations: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    const checked = new Set<HTMLElement>();

    while (node) {
      const txt = node.textContent?.trim() ?? "";
      const el = node.parentElement;
      node = walker.nextNode();
      if (!txt || !el || checked.has(el)) continue;
      checked.add(el);
      if (el.closest(".sr-only")) continue;
      const dialog = el.closest("dialog");
      if (dialog && !dialog.open) continue;
      if (el.getClientRects().length === 0) continue;

      const cs = window.getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      const px = Number.parseFloat(cs.fontSize);
      if (Number.isFinite(px) && px < floorPx - 0.05) {
        violations.push(`${el.tagName.toLowerCase()}("${txt.slice(0, 32)}") = ${px}px`);
      }
    }

    return violations;
  }, minPx);
}

async function assertDomWideE1Invariants(page: Page, contextLabel: string): Promise<string[]> {
  const result = await page.evaluate((email) => {
    const nameHits: string[] = [];

    // 1. All text nodes in document.body outside [data-act="00-hero"]
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const raw = node.textContent?.trim() ?? "";
      const parent = node.parentElement;
      node = walker.nextNode();
      if (!raw || !parent) continue;
      if (parent.closest("script, style")) continue;
      if (parent.closest('[data-act="00-hero"]')) continue;
      const cleaned = raw.replaceAll(email, "").replaceAll("work.jorgebucio.com", "");
      if (/jorge|bucio/i.test(cleaned)) {
        nameHits.push(`text(${parent.tagName.toLowerCase()}): ${cleaned.slice(0, 96)}`);
      }
    }

    // 2. All [alt] and [aria-label] attributes across the entire document.body (including [data-act="00-hero"] & [data-slot="monarch-plate-frame"])
    for (const el of document.body.querySelectorAll("[alt], [aria-label]")) {
      const alt = (el.getAttribute("alt") ?? "")
        .replaceAll(email, "")
        .replaceAll("work.jorgebucio.com", "");
      const label = (el.getAttribute("aria-label") ?? "")
        .replaceAll(email, "")
        .replaceAll("work.jorgebucio.com", "");
      if (/jorge|bucio/i.test(alt)) {
        nameHits.push(`alt(${el.tagName.toLowerCase()}): ${alt.slice(0, 96)}`);
      }
      if (/jorge|bucio/i.test(label)) {
        nameHits.push(`aria-label(${el.tagName.toLowerCase()}): ${label.slice(0, 96)}`);
      }
    }

    const formCount = document.querySelectorAll("form, input, textarea, select").length;
    const telemetryHits = Array.from(
      document.querySelectorAll("img, source, svg, a, iframe, object"),
    )
      .map(
        (el) =>
          `${el.getAttribute("src") ?? ""} ${el.getAttribute("srcset") ?? ""} ${el.getAttribute("href") ?? ""}`,
      )
      .filter((val) =>
        /github-contribution-grid-snake|profile-3d-contrib|\/api\/streak/i.test(val),
      );

    const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]")).map((a) => ({
      href: a.getAttribute("href") ?? "",
      target: a.getAttribute("target") ?? "",
      rel: a.getAttribute("rel") ?? "",
    }));

    return { nameHits, formCount, telemetryHits, anchors };
  }, CONTACT_EMAIL);

  expect(result.nameHits, `Hero-Only Name Rule violation at ${contextLabel}`).toEqual([]);
  expect(result.formCount, `Unexpected form/input at ${contextLabel}`).toBe(0);
  expect(result.telemetryHits, `Unexpected GitHub telemetry widget at ${contextLabel}`).toEqual([]);

  for (const anchor of result.anchors) {
    if (anchor.target === "_blank") {
      expect(anchor.rel, `Missing rel="noopener" at ${contextLabel} (${anchor.href})`).toContain(
        "noopener",
      );
      expect(
        anchor.rel,
        `Missing rel="noreferrer" at ${contextLabel} (${anchor.href})`,
      ).toContain("noreferrer");
    }
  }

  return result.anchors.map((a) => a.href);
}

test.describe("The Atelier Folio (Monarch Edition) Phase 4 verification gauntlet", () => {
  test("E1 & E2: desktop 1440x900 butterfly-first Hero, Hero-Only Name Rule, >= 14px font floor, dialogs, and Axe", async ({
    page,
  }) => {
    const diagnostics = trackPageDiagnostics(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await page.waitForTimeout(350);
    const openingVideoState = await page.evaluate(() => {
      const introVid = document.querySelector<HTMLVideoElement>('video[data-slot="hero-intro-video"]');
      const jorgeInner = document.querySelector<HTMLElement>('[data-slot="hero-first-name"] > span');
      const roleLine = document.querySelector<HTMLElement>('[data-slot="hero-role-line"]');
      const roleRule = document.querySelector<SVGElement>('[data-slot="hero-role-rule"]');
      const plumbWrap = document.querySelector('[data-slot="scroll-plumb-bar"]')?.parentElement;
      return {
        playing: Boolean(introVid && !introVid.paused && !introVid.ended),
        jorgeOpacity: jorgeInner ? Number(window.getComputedStyle(jorgeInner).opacity) : null,
        roleOpacity: roleLine ? Number(window.getComputedStyle(roleLine).opacity) : null,
        ruleOpacity: roleRule ? Number(window.getComputedStyle(roleRule).opacity) : null,
        plumbOpacity: plumbWrap ? Number(window.getComputedStyle(plumbWrap).opacity) : null,
      };
    });

    if (openingVideoState.playing) {
      expect(openingVideoState.jorgeOpacity).toBe(0);
      expect(openingVideoState.roleOpacity).toBe(0);
      expect(openingVideoState.ruleOpacity).toBe(0);
      expect(openingVideoState.plumbOpacity).toBe(0);
    }

    await settleHeroOpening(page);
    await maybeCapture(page, "desktop-00-hero-rest.png");

    // E2: JORGE and BUCIO >= 230px wide at 1440x900 and clear of center Monarch wings
    const heroGeometry = await page.evaluate(() => {
      const jorge = document.querySelector('[data-slot="hero-first-name"]')?.getBoundingClientRect();
      const bucio = document.querySelector('[data-slot="hero-last-name"]')?.getBoundingClientRect();
      const statusLink = document.querySelector('[data-slot="chapter-bar"] a[href="#hero"]');
      return {
        jorge: jorge
          ? { left: jorge.left, top: jorge.top, right: jorge.right, bottom: jorge.bottom, width: jorge.width }
          : null,
        bucio: bucio
          ? { left: bucio.left, top: bucio.top, right: bucio.right, bottom: bucio.bottom, width: bucio.width }
          : null,
        headerDotChildren: statusLink?.children.length ?? 0,
      };
    });

    expect(heroGeometry.jorge).not.toBeNull();
    expect(heroGeometry.bucio).not.toBeNull();
    expect(heroGeometry.jorge!.width).toBeGreaterThanOrEqual(230);
    expect(heroGeometry.bucio!.width).toBeGreaterThanOrEqual(230);
    expect(heroGeometry.jorge!.bottom <= 310 || heroGeometry.jorge!.right <= 560).toBe(true);
    expect(heroGeometry.bucio!.bottom <= 310 || heroGeometry.bucio!.left >= 880).toBe(true);
    expect(heroGeometry.headerDotChildren).toBe(1);

    await assertZeroAxeViolations(page, "Desktop Act 00 Hero settled");
    expect(await findOverlappingVisibleText(page)).toEqual([]);
    expect(await findFontFloorViolations(page, 14)).toEqual([]);

    // Open MenuOverlay: wait for sheet & staggered footer to settle at opacity 1 before Axe/overlap/E1 checks
    const menuTrigger = page.locator('[data-slot="chapter-bar"] button');
    await menuTrigger.click();
    await waitForDialogSettled(page, "#atelier-menu-dialog");
    await maybeCapture(page, "desktop-menu-open.png");

    const closeArrowPaths = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-slot="menu-close-arrow"] path')).map((p) =>
        p.getAttribute("d"),
      ),
    );
    expect(closeArrowPaths).toEqual(["M5 12H19", "M13 6L19 12L13 18"]);

    // Verify MenuOverlay chapter title left-edge alignment (row 00 flush with rows I..V)
    const menuChapterLeftDelta = await page.evaluate(() => {
      const titles = Array.from(
        document.querySelectorAll<HTMLElement>("#atelier-menu-dialog nav ol li a span.flex-1"),
      ).map((el) => el.getBoundingClientRect().left);
      if (titles.length < 2) return 999;
      return Math.max(...titles) - Math.min(...titles);
    });
    expect(menuChapterLeftDelta).toBeLessThanOrEqual(1.5);

    await page.hover('[data-slot="menu-close-button"]');
    await expect(page.locator('[data-slot="menu-close-text"]')).toHaveText("Close");

    await assertDomWideE1Invariants(page, "Desktop MenuOverlay open");
    expect(await findOverlappingVisibleText(page)).toEqual([]);
    expect(await findFontFloorViolations(page, 14)).toEqual([]);
    await assertZeroAxeViolations(page, "Desktop MenuOverlay open");

    await page.keyboard.press("Escape");
    await expect(page.locator("#atelier-menu-dialog")).not.toHaveAttribute("open", "", {
      timeout: 5000,
    });
    await expect(menuTrigger).toBeFocused();

    // Scroll to Act 05 Connect & verify ColophonSheet dialog settled at opacity 1 + DOM-wide E1 invariants
    const maxDesktopScroll = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    );
    await scrollToYAndFlushScrub(page, maxDesktopScroll);

    const colophonTrigger = page.locator('button[aria-controls="atelier-colophon-dialog"]');
    await colophonTrigger.click();
    await waitForDialogSettled(page, "#atelier-colophon-dialog");
    await maybeCapture(page, "desktop-colophon-open.png");

    await assertDomWideE1Invariants(page, "Desktop ColophonSheet open");
    expect(await findOverlappingVisibleText(page)).toEqual([]);
    expect(await findFontFloorViolations(page, 14)).toEqual([]);
    await assertZeroAxeViolations(page, "Desktop ColophonSheet open");

    await page.keyboard.press("Escape");
    await expect(page.locator("#atelier-colophon-dialog")).not.toHaveAttribute("open", "", {
      timeout: 5000,
    });
    await expect(colophonTrigger).toBeFocused();

    const hrefList = await assertDomWideE1Invariants(page, "Desktop settled DOM");
    const allHrefs = new Set(hrefList);
    expect(allHrefs.has(PORTFOLIO_URL)).toBe(true);
    expect(allHrefs.has(GITHUB_URL)).toBe(true);
    expect(allHrefs.has(GITHUB_REPOS_URL)).toBe(true);
    expect(allHrefs.has(LINKEDIN_URL)).toBe(true);
    expect(allHrefs.has(`mailto:${CONTACT_EMAIL}`)).toBe(true);

    diagnostics.assertClean();
  });

  test("E3: scroll midpoints (0.20, 0.35, 0.50, 0.70) & Acts 01-05 have zero text overlaps, exact card geometry, play-once hover videos, and zero Axe violations", async ({
    page,
  }) => {
    const diagnostics = trackPageDiagnostics(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await settleHeroOpening(page);

    // Midpoint 0.20 + Act 01 Journey hold 0.235 + butterfly wing-flutter play-once & hover replay
    await scrollToStageProgress(page, 0.2);
    await maybeCapture(page, "desktop-midpoint-020.png");
    expect(await findOverlappingVisibleText(page)).toEqual([]);

    await scrollToStageProgress(page, 0.235);
    await maybeCapture(page, "desktop-01-journey-rest.png");
    expect(await findOverlappingVisibleText(page)).toEqual([]);
    expect(await findFontFloorViolations(page, 14)).toEqual([]);
    await assertZeroAxeViolations(page, "Desktop Act 01 Journey hold");

    const p2Video = await page.evaluate(() => {
      const vid = document.querySelector<HTMLVideoElement>('video[data-slot="hero-transition-video"]');
      if (!vid) return null;
      const canSeek = Number.isFinite(vid.duration) && vid.duration > 2;
      if (canSeek && !vid.paused) {
        vid.currentTime = 1.2;
      }
      return {
        loop: vid.loop,
        playing: !vid.paused && !vid.ended,
        canSeek,
      };
    });

    if (p2Video) {
      expect(p2Video.loop).toBe(false);
      if (p2Video.playing && p2Video.canSeek) {
        await page.waitForTimeout(80);
        await page.hover('[data-slot="journey-center-slot"]');
        await page.mouse.move(20, 20);
        await page.hover('[data-slot="journey-center-slot"]');
        await page.waitForTimeout(220);
        const afterMidHover = await page.evaluate(
          () => document.querySelector<HTMLVideoElement>('video[data-slot="hero-transition-video"]')?.currentTime ?? 0,
        );
        expect(afterMidHover).toBeGreaterThan(1.2);

        await page.mouse.move(20, 20);
        await page.evaluate(() => {
          const vid = document.querySelector<HTMLVideoElement>('video[data-slot="hero-transition-video"]');
          if (vid && Number.isFinite(vid.duration) && vid.duration > 0.25) {
            vid.currentTime = vid.duration - 0.1;
          }
        });
        await page.waitForTimeout(350);
        const rested = await page.evaluate(
          () => document.querySelector<HTMLVideoElement>('video[data-slot="hero-transition-video"]')?.paused ?? false,
        );
        expect(rested).toBe(true);

        await page.hover('[data-slot="journey-center-slot"]');
        await page.waitForTimeout(200);
        const retriggered = await page.evaluate(
          () => !(document.querySelector<HTMLVideoElement>('video[data-slot="hero-transition-video"]')?.paused ?? true),
        );
        expect(retriggered).toBe(true);
      }
    }

    // Midpoint 0.35 (3D horizontal flip right-to-left into cotton-rag white card)
    await scrollToStageProgress(page, 0.35);
    await maybeCapture(page, "desktop-midpoint-035-flip.png");
    expect(await findOverlappingVisibleText(page)).toEqual([]);

    // Midpoint 0.50 & Act 02 Craft settled hold 0.535
    await scrollToStageProgress(page, 0.5);
    await maybeCapture(page, "desktop-midpoint-050.png");
    expect(await findOverlappingVisibleText(page)).toEqual([]);

    await scrollToStageProgress(page, 0.535);
    await maybeCapture(page, "desktop-02-craft-rest.png");
    expect(await findOverlappingVisibleText(page)).toEqual([]);
    expect(await findFontFloorViolations(page, 14)).toEqual([]);
    await assertZeroAxeViolations(page, "Desktop Act 02 Craft hold");

    const craftAlignment = await page.evaluate(() => {
      const plate = document.querySelector('[data-slot="monarch-plate-frame"]')?.getBoundingClientRect();
      const card = document.querySelector('[data-slot="craft-specimen-plate"]')?.getBoundingClientRect();
      if (!plate || !card) return null;
      return {
        dx: Math.abs(plate.left - card.left),
        dy: Math.abs(plate.top - card.top),
        dw: Math.abs(plate.width - card.width),
        dh: Math.abs(plate.height - card.height),
        bottom: card.bottom,
      };
    });
    expect(craftAlignment).not.toBeNull();
    expect(craftAlignment!.dx).toBeLessThanOrEqual(2);
    expect(craftAlignment!.dy).toBeLessThanOrEqual(2);
    expect(craftAlignment!.dw).toBeLessThanOrEqual(2);
    expect(craftAlignment!.dh).toBeLessThanOrEqual(2);
    expect(craftAlignment!.bottom).toBeLessThanOrEqual(900);

    // Midpoint 0.70 (right card growing to fill window & shifting to Act 03 botanical olive)
    await scrollToStageProgress(page, 0.7);
    await maybeCapture(page, "desktop-midpoint-070-olive.png");
    expect(await findOverlappingVisibleText(page)).toEqual([]);

    // Act 03 Stack settled hold 0.955 (idle studio note + interactive lower-right related builds pocket)
    await scrollToStageProgress(page, 0.955);
    await maybeCapture(page, "desktop-03-stack-rest.png");
    expect(await findOverlappingVisibleText(page)).toEqual([]);
    expect(await findFontFloorViolations(page, 14)).toEqual([]);
    await assertZeroAxeViolations(page, "Desktop Act 03 Stack hold");

    const stageStackBuilds = page.locator(
      '[data-slot="stage-stack-layer"] [data-slot="stack-related-builds"]',
    );
    await expect(stageStackBuilds).toContainText("Select an instrument across the four columns");
    const idlePocketBox = await stageStackBuilds.boundingBox();
    expect(idlePocketBox).not.toBeNull();
    expect(idlePocketBox!.x).toBeGreaterThan(360);
    expect(idlePocketBox!.width).toBeGreaterThan(800);
    expect(idlePocketBox!.y + idlePocketBox!.height).toBeLessThanOrEqual(896);

    const idbStageBtn = page.locator(
      '[data-slot="stage-stack-layer"] button[data-tool-id="indexeddb"]',
    );
    await idbStageBtn.click();
    await page.waitForTimeout(380);
    await expect(stageStackBuilds).toContainText("Built with IndexedDB");
    await expect(stageStackBuilds).toContainText("Fleet Pulse");
    await expect(stageStackBuilds).toContainText("AniBeam");
    expect(await findOverlappingVisibleText(page)).toEqual([]);
    expect(await findFontFloorViolations(page, 14)).toEqual([]);
    await assertDomWideE1Invariants(page, "Desktop Act 03 IndexedDB selected");

    // Hovering a shipped build hangs its reel centred from the top of the chapter, ending near mid-screen
    const fleetCard = page.locator('[data-slot="stage-stack-layer"] li[data-project-id="fleet-pulse"]');
    await fleetCard.hover();
    const fleetReel = page.locator('[data-slot="stage-stack-layer"] [data-slot="build-reel"][data-project="fleet-pulse"]');
    await expect(fleetReel).toBeVisible();
    await expect(fleetReel).toHaveAttribute("data-placement", "hang");
    await page.waitForTimeout(1300);
    const reelBox = await fleetReel.boundingBox();
    const fleetBox = await fleetCard.boundingBox();
    expect(reelBox).not.toBeNull();
    expect(fleetBox).not.toBeNull();
    expect(Math.abs(reelBox!.x + reelBox!.width / 2 - 720)).toBeLessThanOrEqual(2);
    expect(reelBox!.y).toBeGreaterThanOrEqual(40);
    expect(reelBox!.y + reelBox!.height).toBeLessThanOrEqual(900 * 0.6);
    expect(reelBox!.width).toBeLessThanOrEqual(620);
    expect(reelBox!.width).toBeGreaterThanOrEqual(560);
    expect(reelBox!.y + reelBox!.height).toBeLessThan(fleetBox!.y);
    const reelVideo = fleetReel.locator('video[data-slot="build-reel-video"]');
    const firstTime = await reelVideo.evaluate((v: HTMLVideoElement) => v.currentTime);
    await page.waitForTimeout(500);
    expect(await reelVideo.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(firstTime);
    await maybeCapture(page, "desktop-03-stack-reel.png");
    // The reel's canvas bleed must never cover the card's own links
    const liveLinkOnTop = await fleetCard
      .getByRole("link", { name: "Fleet Pulse live deployment" })
      .evaluate((link) => {
        const r = link.getBoundingClientRect();
        return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === link;
      });
    expect(liveLinkOnTop).toBe(true);
    await assertZeroAxeViolations(page, "Desktop Act 03 build reel open");
    await page.mouse.move(8, 8);
    await expect(fleetReel).toHaveCount(0);

    const vitestStageBtn = page.locator(
      '[data-slot="stage-stack-layer"] button[data-tool-id="vitest"]',
    );
    await vitestStageBtn.click();
    await page.waitForTimeout(380);
    await maybeCapture(page, "desktop-03-stack-selected.png");
    await expect(stageStackBuilds).toContainText("Built with Vitest");
    await expect(stageStackBuilds).toContainText("Fleet Pulse");
    await expect(stageStackBuilds).toContainText("JobSeance");
    await expect(stageStackBuilds).toContainText("TorqueLine");
    const activePocketBox = await stageStackBuilds.boundingBox();
    expect(activePocketBox).not.toBeNull();
    expect(activePocketBox!.x).toBeGreaterThan(360);
    expect(activePocketBox!.y + activePocketBox!.height).toBeLessThanOrEqual(896);
    expect(await findOverlappingVisibleText(page)).toEqual([]);
    expect(await findFontFloorViolations(page, 14)).toEqual([]);
    await assertDomWideE1Invariants(page, "Desktop Act 03 Vitest selected");
    await assertZeroAxeViolations(page, "Desktop Act 03 Vitest selected");

    await vitestStageBtn.click();
    await page.waitForTimeout(200);
    await expect(stageStackBuilds).toContainText("Select an instrument across the four columns");

    // Act 04 Portfolio portal + play-once / non-interrupting hover porch video + completion & hover retrigger
    const portfolioY = await page.evaluate(() => {
      const stageEl = document.querySelector('[data-slot="portfolio-connect-stage"]');
      if (!stageEl) throw new Error("portfolio-connect-stage missing");
      return Math.round(stageEl.getBoundingClientRect().top + window.scrollY);
    });
    await scrollToYAndFlushScrub(page, portfolioY);
    await page.waitForTimeout(350);
    await maybeCapture(page, "desktop-04-portfolio-rest.png");
    expect(await findOverlappingVisibleText(page)).toEqual([]);
    expect(await findFontFloorViolations(page, 14)).toEqual([]);
    await assertZeroAxeViolations(page, "Desktop Act 04 Portfolio");

    const porchState = await page.evaluate(() => {
      const vid = document.querySelector<HTMLVideoElement>('video[data-slot="portfolio-porch-video"]');
      if (!vid) return null;
      const canSeek = Number.isFinite(vid.duration) && vid.duration > 2;
      if (canSeek && !vid.paused) {
        vid.currentTime = 1.2;
      }
      return {
        loop: vid.loop,
        playing: !vid.paused && !vid.ended,
        canSeek,
      };
    });

    if (porchState) {
      expect(porchState.loop).toBe(false);
      if (porchState.playing && porchState.canSeek) {
        await page.waitForTimeout(80);
        await page.hover('[data-slot="portfolio-print-frame"]');
        await page.mouse.move(20, 20);
        await page.hover('[data-slot="portfolio-print-frame"]');
        await page.waitForTimeout(220);
        const afterMidHover = await page.evaluate(
          () => document.querySelector<HTMLVideoElement>('video[data-slot="portfolio-porch-video"]')?.currentTime ?? 0,
        );
        expect(afterMidHover).toBeGreaterThan(1.2);

        await page.mouse.move(20, 20);
        await page.evaluate(() => {
          const vid = document.querySelector<HTMLVideoElement>('video[data-slot="portfolio-porch-video"]');
          if (vid && Number.isFinite(vid.duration) && vid.duration > 0.25) {
            vid.currentTime = vid.duration - 0.1;
          }
        });
        await page.waitForTimeout(350);
        const porchRested = await page.evaluate(
          () => document.querySelector<HTMLVideoElement>('video[data-slot="portfolio-porch-video"]')?.paused ?? false,
        );
        expect(porchRested).toBe(true);

        await page.hover('[data-slot="portfolio-print-frame"]');
        await page.waitForTimeout(200);
        const porchRetriggered = await page.evaluate(
          () => !(document.querySelector<HTMLVideoElement>('video[data-slot="portfolio-porch-video"]')?.paused ?? true),
        );
        expect(porchRetriggered).toBe(true);
      }
    }

    // Act 04 -> Act 05 slide-over midpoint
    const slideOverY = await page.evaluate(() => {
      const stageEl = document.querySelector('[data-slot="portfolio-connect-stage"]');
      if (!stageEl) throw new Error("portfolio-connect-stage missing");
      return Math.round(stageEl.getBoundingClientRect().top + window.scrollY + window.innerHeight * 0.54);
    });
    await scrollToYAndFlushScrub(page, slideOverY);
    await maybeCapture(page, "desktop-midpoint-05-slideover.png");

    const slideOver = await page.evaluate(() => ({
      portfolioTop: Math.round(document.getElementById("portfolio")?.getBoundingClientRect().top ?? -999),
      connectTop: Math.round(document.getElementById("connect")?.getBoundingClientRect().top ?? -999),
    }));
    expect(slideOver.portfolioTop).toBe(0);
    expect(slideOver.connectTop).toBeGreaterThan(80);
    expect(slideOver.connectTop).toBeLessThan(760);
    expect(await findOverlappingVisibleText(page)).toEqual([]);

    // Act 05 Connect settled at document bottom
    const bottomY = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    );
    await scrollToYAndFlushScrub(page, bottomY);
    await maybeCapture(page, "desktop-05-connect-rest.png");
    expect(await findOverlappingVisibleText(page)).toEqual([]);
    expect(await findFontFloorViolations(page, 14)).toEqual([]);
    await assertZeroAxeViolations(page, "Desktop Act 05 Connect settled");

    await expect
      .poll(async () => {
        const raw = await page
          .locator('[data-slot="scroll-plumb-bar"]')
          .getAttribute("data-progress");
        return Number(raw ?? "0");
      })
      .toBeGreaterThanOrEqual(0.99);
    await expect(page.locator('[data-slot="scroll-plumb-bar"]')).toHaveAttribute(
      "data-docked",
      "true",
    );

    diagnostics.assertClean();
  });

  test("E1 & E2: mobile 390x844 fits Hero CTAs above fold, maintains scrollWidth === 390 across all 6 acts, and passes Axe on pages & open dialogs", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    const diagnostics = trackPageDiagnostics(page);

    try {
      await page.goto("/", { waitUntil: "networkidle" });
      await settleHeroOpening(page);
      await maybeCapture(page, "mobile-00-hero.png");
      await maybeCapture(page, "mobile-390-top.png");

      // The cotton-rag mat shows on all four sides of the hero plate (no image over the bottom mat)
      const matInsets = await page.evaluate(() => {
        const frame = document.querySelector('[data-act="00-hero"] [data-slot="monarch-plate-frame"]');
        const img = frame?.querySelector("img");
        if (!frame || !img) return null;
        const f = frame.getBoundingClientRect();
        const i = img.getBoundingClientRect();
        return [i.top - f.top, f.right - i.right, f.bottom - i.bottom, i.left - f.left];
      });
      expect(matInsets).not.toBeNull();
      for (const inset of matInsets!) expect(inset).toBeGreaterThanOrEqual(6);

      // Both Hero CTA links must sit completely inside the 390x844 viewport at scrollY = 0
      const mobileHeroCtas = await page.evaluate(() => {
        const ctas = Array.from(
          document.querySelectorAll<HTMLAnchorElement>(
            '[data-act="00-hero"] a[href*="work.jorgebucio.com"], [data-act="00-hero"] a[href="#connect"]',
          ),
        );
        return ctas.map((a) => {
          const r = a.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, height: r.height };
        });
      });
      expect(mobileHeroCtas).toHaveLength(2);
      for (const cta of mobileHeroCtas) {
        expect(cta.top).toBeGreaterThanOrEqual(0);
        expect(cta.bottom).toBeLessThanOrEqual(834);
      }

      // Capture & verify every section on 390x844 phone (Acts 00 through 05)
      const actShots: Array<{ selector: string; file: string; label: string }> = [
        { selector: '[data-act="00-hero"]', file: "mobile-00-hero.png", label: "Mobile Act 00 Hero" },
        { selector: '[data-act="01-journey"]', file: "mobile-01-journey.png", label: "Mobile Act 01 Journey" },
        { selector: '[data-act="02-craft"]', file: "mobile-02-craft.png", label: "Mobile Act 02 Craft" },
        { selector: '[data-act="03-stack"]', file: "mobile-03-stack.png", label: "Mobile Act 03 Stack" },
        { selector: '[data-act="04-portfolio"]', file: "mobile-04-portfolio.png", label: "Mobile Act 04 Portfolio" },
        { selector: '[data-act="05-connect"]', file: "mobile-05-connect.png", label: "Mobile Act 05 Connect" },
      ];

      for (const act of actShots) {
        const targetY = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) throw new Error(`Missing ${sel}`);
          return Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY));
        }, act.selector);
        await scrollToYAndFlushScrub(page, targetY);
        await maybeCapture(page, act.file);

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth, `Mobile scrollWidth overflow at ${act.label}`).toBe(390);
        expect(
          await findOverlappingVisibleText(page),
          `Mobile text overlap at ${act.label}`,
        ).toEqual([]);
        await assertZeroAxeViolations(page, act.label);

        if (act.selector === '[data-act="03-stack"]') {
          const mobileTsBtn = page.locator('[data-act="03-stack"] button[data-tool-id="typescript"]');
          await mobileTsBtn.scrollIntoViewIfNeeded();
          await mobileTsBtn.tap();
          await page.waitForTimeout(340);
          const mobileInlineBuilds = page.locator('[data-act="03-stack"] [data-slot="stack-related-builds"]');
          await expect(mobileInlineBuilds).toContainText("Built with TypeScript");
          await expect(mobileInlineBuilds).toContainText("JobSeance");
          const tsBox = await mobileTsBtn.boundingBox();
          const inlineBox = await mobileInlineBuilds.boundingBox();
          expect(tsBox).not.toBeNull();
          expect(inlineBox).not.toBeNull();
          expect(inlineBox!.y - (tsBox!.y + tsBox!.height)).toBeLessThanOrEqual(24);
          expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
          expect(await findOverlappingVisibleText(page)).toEqual([]);
          await assertZeroAxeViolations(page, "Mobile Act 03 TypeScript inline builds");

          const mobileReelToggle = mobileInlineBuilds.getByRole("button", { name: "JobSeance reel" });
          await mobileReelToggle.tap();
          await expect(mobileReelToggle).toHaveAttribute("aria-pressed", "true");
          const mobileReel = mobileInlineBuilds.locator('[data-slot="build-reel"][data-placement="inline"]');
          await expect(mobileReel).toBeVisible();
          await page.waitForTimeout(1500);
          await maybeCapture(page, "mobile-03-stack-reel.png");
          expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
          await assertZeroAxeViolations(page, "Mobile Act 03 inline build reel");
          await mobileReelToggle.tap();
          await expect(mobileReel).toHaveCount(0);

          await mobileTsBtn.tap();
          await page.waitForTimeout(200);
        }
      }

      // Scroll to absolute bottom of document to verify Direct Contact Card + ColophonSheet dialog on 390x844
      const mobileBottomY = await page.evaluate(() => document.documentElement.scrollHeight);
      await scrollToYAndFlushScrub(page, mobileBottomY);
      await maybeCapture(page, "mobile-390-bottom.png");
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
      expect(await findOverlappingVisibleText(page)).toEqual([]);
      await assertZeroAxeViolations(page, "Mobile 390x844 document bottom");

      const mobileColophonTrigger = page.locator('button[aria-controls="atelier-colophon-dialog"]');
      await mobileColophonTrigger.click();
      await waitForDialogSettled(page, "#atelier-colophon-dialog");
      await maybeCapture(page, "mobile-colophon-open.png");
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
      expect(await findOverlappingVisibleText(page)).toEqual([]);
      await assertDomWideE1Invariants(page, "Mobile ColophonSheet open");
      await assertZeroAxeViolations(page, "Mobile 390x844 ColophonSheet open");
      await page.keyboard.press("Escape");
      await expect(page.locator("#atelier-colophon-dialog")).not.toHaveAttribute("open", "", {
        timeout: 5000,
      });
      await expect(mobileColophonTrigger).toBeFocused();

      // Scroll back to top so auto-hiding ChapterBar returns into viewport before opening MenuOverlay
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(450);
      const mobileMenuTrigger = page.locator('[data-slot="chapter-bar"] button');
      await mobileMenuTrigger.click();
      await waitForDialogSettled(page, "#atelier-menu-dialog");
      await maybeCapture(page, "mobile-menu-open.png");
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
      expect(await findOverlappingVisibleText(page)).toEqual([]);
      await assertDomWideE1Invariants(page, "Mobile MenuOverlay open");
      await assertZeroAxeViolations(page, "Mobile 390x844 MenuOverlay open");
      await page.keyboard.press("Escape");
      await expect(page.locator("#atelier-menu-dialog")).not.toHaveAttribute("open", "", {
        timeout: 5000,
      });
      await expect(mobileMenuTrigger).toBeFocused();

      // Touch: the close control is labelled, a swipe right closes the sheet, and so does
      // a tap on the dimmed sliver of page left beside it
      const menuDialog = page.locator("#atelier-menu-dialog");
      await mobileMenuTrigger.tap();
      await waitForDialogSettled(page, "#atelier-menu-dialog");
      await expect(page.locator('[data-slot="menu-close-button"]')).toContainText("Close");
      const touch = await context.newCDPSession(page);
      await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 120, y: 320 }] });
      for (let step = 1; step <= 12; step += 1) {
        await touch.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: 120 + step * 18, y: 320 }],
        });
        await page.waitForTimeout(16);
      }
      await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await expect(menuDialog).not.toHaveAttribute("open", "", { timeout: 5000 });

      await mobileMenuTrigger.tap();
      await waitForDialogSettled(page, "#atelier-menu-dialog");
      await page.touchscreen.tap(20, 420);
      await expect(menuDialog).not.toHaveAttribute("open", "", { timeout: 5000 });

      await assertDomWideE1Invariants(page, "Mobile 390x844 stacked DOM");
      diagnostics.assertClean();
    } finally {
      await context.close();
    }
  });

  test("Tablet portrait 810x1080 touch: stacked layout, full-size videos, intact mat, slide-over chapter tracking, inline reels, and touch menu", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 810, height: 1080 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    const diagnostics = trackPageDiagnostics(page);
    const chapterBar = page.locator('[data-slot="chapter-bar"]');

    try {
      await page.goto("/", { waitUntil: "networkidle" });
      await settleHeroOpening(page);
      await maybeCapture(page, "tablet-portrait-00-hero.png");

      // Portrait tablets take the stacked layout but keep the full-size (not phone) video sources
      await expect(page.locator('[data-slot="hero-journey-stacked"]')).toHaveCount(1);
      const introSrc = await page
        .locator('video[data-slot="hero-intro-video"]')
        .evaluate((v: HTMLVideoElement) => v.currentSrc);
      expect(introSrc).toMatch(/hero-monarch-intro\.(webm|mp4)$/);
      expect(introSrc).not.toContain("-m.mp4");

      const insets = await heroMatInsets(page);
      expect(insets).not.toBeNull();
      for (const inset of insets!) expect(inset).toBeGreaterThanOrEqual(6);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(810);
      await assertZeroAxeViolations(page, "Tablet portrait hero");

      // The espresso Journey sheet slides over the sticky hero, which fades out beneath it
      const journeyTop = await page.evaluate(
        () => document.querySelector('[data-act="01-journey"]')!.getBoundingClientRect().top + window.scrollY,
      );
      await scrollToYAndFlushScrub(page, Math.round(journeyTop));
      await page.waitForTimeout(400);
      await maybeCapture(page, "tablet-portrait-01-journey.png");
      const recedeOpacity = await page
        .locator("[data-mobile-recede]")
        .evaluate((el) => Number.parseFloat(getComputedStyle(el).opacity));
      expect(recedeOpacity).toBeLessThan(0.18);
      await expect(chapterBar).toContainText("I · My Journey");
      expect(await findOverlappingVisibleText(page)).toEqual([]);
      await assertZeroAxeViolations(page, "Tablet portrait Journey");

      // Scrolling back up hands the chapter label back to the opening folio
      await scrollToYAndFlushScrub(page, 0);
      await expect(chapterBar).toContainText("Menifee, Southern California");

      // Chapter III below 1024px: builds inline under the tool, and a Reel toggle unrolls the scroll in the card
      const stackTs = page.locator('[data-act="03-stack"] button[data-tool-id="typescript"]');
      await stackTs.scrollIntoViewIfNeeded();
      await stackTs.tap();
      const inlineBuilds = page.locator('[data-act="03-stack"] [data-slot="stack-related-builds"]');
      await expect(inlineBuilds).toContainText("Built with TypeScript");
      await expect(inlineBuilds).toContainText("Tap Reel to screen a build");
      const reelToggle = inlineBuilds.getByRole("button", { name: "JobSeance reel" });
      await reelToggle.tap();
      await expect(reelToggle).toHaveAttribute("aria-pressed", "true");
      const inlineReel = inlineBuilds.locator('[data-slot="build-reel"][data-placement="inline"]');
      await expect(inlineReel).toBeVisible();
      await page.waitForTimeout(1500);
      await maybeCapture(page, "tablet-portrait-03-reel.png");
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(810);
      await reelToggle.tap();
      await expect(inlineReel).toHaveCount(0);
      await stackTs.tap();

      // The porch walk-out plays when its print scrolls into view (full-size source)
      const porch = page.locator('[data-slot="portfolio-porch-video"]');
      await porch.scrollIntoViewIfNeeded();
      await expect
        .poll(() => porch.evaluate((v: HTMLVideoElement) => (v.paused ? 0 : v.currentTime)), { timeout: 8000 })
        .toBeGreaterThan(0);
      expect(await porch.evaluate((v: HTMLVideoElement) => v.currentSrc)).not.toContain("-m.mp4");

      // Touch menu: labelled close, backdrop tap beside the 560px sheet, and swipe right all close it
      await scrollToYAndFlushScrub(page, 0);
      await page.waitForTimeout(450);
      const menuTrigger = page.locator('[data-slot="chapter-bar"] button');
      const menuDialog = page.locator("#atelier-menu-dialog");
      await menuTrigger.tap();
      await waitForDialogSettled(page, "#atelier-menu-dialog");
      await expect(page.locator('[data-slot="menu-close-button"]')).toContainText("Close");
      await assertZeroAxeViolations(page, "Tablet portrait menu open");
      await page.touchscreen.tap(60, 540);
      await expect(menuDialog).not.toHaveAttribute("open", "", { timeout: 5000 });

      await menuTrigger.tap();
      await waitForDialogSettled(page, "#atelier-menu-dialog");
      await swipeRight(context, page, 320, 540, 260);
      await expect(menuDialog).not.toHaveAttribute("open", "", { timeout: 5000 });

      diagnostics.assertClean();
    } finally {
      await context.close();
    }
  });

  test("Tablet landscape 1194x834 touch: desktop stage with tap-mode Reel toggles hanging the centred scroll", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 1194, height: 834 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    const diagnostics = trackPageDiagnostics(page);

    try {
      await page.goto("/", { waitUntil: "networkidle" });
      await settleHeroOpening(page);
      await expect(page.locator('[data-slot="hero-journey-stacked"]')).toHaveCount(0);

      await scrollToStageProgress(page, 0.955);
      await page.waitForTimeout(400);
      const stage = '[data-slot="stage-stack-layer"]';
      await page.locator(`${stage} button[data-tool-id="postgresql"]`).tap();
      const sheet = page.locator(`${stage} [data-slot="stack-related-builds"]`);
      await expect(sheet).toContainText("Built with PostgreSQL");
      await expect(sheet).toContainText("Tap Reel to screen a build");

      const toggle = sheet.getByRole("button", { name: "Campfire of the Damned reel" });
      await toggle.tap();
      await expect(toggle).toHaveAttribute("aria-pressed", "true");
      const hung = page.locator(`${stage} [data-slot="build-reel"][data-placement="hang"]`);
      await expect(hung).toBeVisible();
      await page.waitForTimeout(1300);
      await maybeCapture(page, "tablet-landscape-03-reel.png");
      const box = await hung.boundingBox();
      expect(box).not.toBeNull();
      expect(Math.abs(box!.x + box!.width / 2 - 1194 / 2)).toBeLessThanOrEqual(2);
      expect(box!.y + box!.height).toBeLessThanOrEqual(834 * 0.62);
      const sheetBox = await sheet.boundingBox();
      expect(box!.y + box!.height).toBeLessThan(sheetBox!.y);

      await toggle.tap();
      await expect(hung).toHaveCount(0, { timeout: 3000 });
      diagnostics.assertClean();
    } finally {
      await context.close();
    }
  });

  test("prefers-reduced-motion: reduce renders static legible six-act folio with zero video autoplay and zero Axe violations across all stops", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const diagnostics = trackPageDiagnostics(page);

    try {
      await page.goto("/", { waitUntil: "networkidle" });
      const reducedState = await page.evaluate(() => {
        const jorgeInner = document.querySelector<HTMLElement>(
          '[data-slot="hero-first-name"] > span',
        );
        const bucioInner = document.querySelector<HTMLElement>(
          '[data-slot="hero-last-name"] > span',
        );
        const rule = document.querySelector<SVGElement>('[data-slot="hero-role-rule"]');
        return {
          videoCount: document.querySelectorAll("video").length,
          hasPinnedStage: Boolean(window.ScrollTrigger?.getById("hero-journey-pin")),
          jorgeOpacity: jorgeInner ? Number(window.getComputedStyle(jorgeInner).opacity) : 0,
          bucioOpacity: bucioInner ? Number(window.getComputedStyle(bucioInner).opacity) : 0,
          ruleOpacity: rule ? Number(window.getComputedStyle(rule).opacity) : 0,
          actCount: document.querySelectorAll("[data-act]").length,
        };
      });

      expect(reducedState.videoCount).toBe(0);
      expect(reducedState.hasPinnedStage).toBe(false);
      expect(reducedState.jorgeOpacity).toBe(1);
      expect(reducedState.bucioOpacity).toBe(1);
      expect(reducedState.ruleOpacity).toBe(1);
      expect(reducedState.actCount).toBe(6);

      for (const ratio of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
        await page.evaluate((r) => {
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          window.scrollTo(0, Math.round(maxScroll * r));
        }, ratio);
        await page.waitForTimeout(160);
        expect(
          await findOverlappingVisibleText(page),
          `Reduced-motion overlap at ratio ${ratio}`,
        ).toEqual([]);
      }

      await assertZeroAxeViolations(page, "Desktop prefers-reduced-motion: reduce");
      diagnostics.assertClean();
    } finally {
      await context.close();
    }
  });

  test("E4: README.md preserves hero typing SVG, profile views badge, PAISE program, forward vision, discipline-grouped repertoire badges, GitHub telemetry widgets, and all 6 engineering sections with zero emojis", async () => {
    const readmePath = path.resolve(import.meta.dirname, "../../README.md");
    const readme = fs.readFileSync(readmePath, "utf8");

    expect(readme).toContain("https://readme-typing-svg.demolab.com");
    expect(readme).toContain("https://komarev.com/ghpvc/?username=ZynzTehr&label=PROFILE+VIEWS&color=0A66C2&style=for-the-badge");
    expect(readme).toContain("Fair Chance Futures' PAISE Program");
    expect(readme).toContain("### Forward vision");
    expect(readme).toContain("https://jorgebucio.com/");
    expect(readme).toContain("https://zynztehr.dev/");
    expect(readme).toContain("/api/streak?user=ZynzTehr");
    expect(readme).toContain("github-contribution-grid-snake");
    for (const themeSvg of TEN_CONTRIB_SVGS) {
      expect(readme).toContain(themeSvg);
    }
    expect(readme).toContain(CONTACT_EMAIL);
    expect(readme).toContain(PORTFOLIO_URL);

    for (const heading of [
      "## Technical repertoire",
      "### Interface and motion",
      "### Systems and data",
      "### Applied AI",
      "### Web3 and blockchain",
      "### Verification and delivery",
      "## System Overview",
      "## Subdirectories & System Boundaries",
      "## Interface",
      "## Invariants",
      "## Side Effects",
      "## Verification",
    ]) {
      expect(readme).toContain(heading);
    }

    expect(readme).toContain("badge/Motoko_(ICP)-");
    expect(readme).toContain("badge/jQuery-");
    expect(readme).toContain("badge/Anthropic_Claude_API-");
    expect(readme).toContain("badge/Playwright-");
    expect(readme).not.toMatch(/outlook\.com/i);
    expect(readme).not.toContain("#skills");
    expect(readme).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
