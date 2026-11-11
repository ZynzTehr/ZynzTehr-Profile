import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();

  class MockWebGLRenderer {
    static shouldThrow = false;
    static returnNullContext = false;
    domElement: HTMLCanvasElement;

    constructor(params?: { canvas?: HTMLCanvasElement }) {
      if (MockWebGLRenderer.shouldThrow) {
        throw new Error("WebGL disabled");
      }
      this.domElement = params?.canvas ?? document.createElement("canvas");
    }

    getContext() {
      return MockWebGLRenderer.returnNullContext ? null : ({} as WebGLRenderingContext);
    }

    setPixelRatio() {}
    setSize() {}
    render() {}
    dispose() {}
  }

  return {
    ...actual,
    WebGLRenderer: MockWebGLRenderer,
  };
});

import * as THREE from "three";
import { App } from "../App";
import { MonarchReliefCanvas } from "../canvas/MonarchReliefCanvas";
import { CONTACT_EMAIL } from "../data/profileContent";
import {
  navigateToAnchor,
  PINNED_STAGE_HOLD_PROGRESS,
  ScrollTrigger,
} from "../lib/scrollEngine";

type MockRendererClass = typeof THREE.WebGLRenderer & {
  shouldThrow: boolean;
  returnNullContext: boolean;
};

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  cleanup();
  window.matchMedia = originalMatchMedia;
  Object.defineProperty(window, "scrollY", { value: 0, writable: true, configurable: true });
  const MockRenderer = THREE.WebGLRenderer as unknown as MockRendererClass;
  MockRenderer.shouldThrow = false;
  MockRenderer.returnNullContext = false;
});

function stripPermittedEmail(input: string): string {
  return input.replaceAll(CONTACT_EMAIL, "");
}

describe("Phase 2: MonarchReliefCanvas, MenuOverlay, and Hero-Only Name Rule", () => {
  it("falls back cleanly without console errors when WebGL context creation throws", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const MockRenderer = THREE.WebGLRenderer as unknown as MockRendererClass;
    MockRenderer.shouldThrow = true;

    const { container } = render(<MonarchReliefCanvas videoActive />);
    expect(container.querySelector("canvas")).toBeNull();
    expect(errorSpy).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it("unmounts canvas cleanly on webglcontextlost without console errors", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { container } = render(<MonarchReliefCanvas videoActive />);
    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();

    const lostEvent = new Event("webglcontextlost", { cancelable: true });
    fireEvent(canvas as HTMLCanvasElement, lostEvent);
    expect(lostEvent.defaultPrevented).toBe(true);

    await waitFor(() => {
      expect(container.querySelector("canvas")).toBeNull();
    });
    expect(errorSpy).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it("opens MenuOverlay <dialog>, preserves scrollY, closes on Escape, and restores trigger focus", async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, "scrollY", { value: 420, writable: true, configurable: true });

    render(<App />);

    const menuTrigger = screen.getByRole("button", { name: /menu/i });
    const chapterBar = document.querySelector('[data-slot="chapter-bar"]');
    expect(chapterBar?.querySelector('[class*="accent-amber-dot"]')).toBeNull();
    const homeStatusLink = chapterBar?.querySelector('a[href="#hero"]');
    expect(homeStatusLink?.querySelectorAll("span").length).toBe(1);

    const topLine = menuTrigger.querySelector('[data-slot="menu-line-top"]');
    const bottomLine = menuTrigger.querySelector('[data-slot="menu-line-bottom"]');
    expect(topLine).not.toBeNull();
    expect(bottomLine).not.toBeNull();
    expect(topLine?.className).toContain("w-4");
    expect(bottomLine?.className).toContain("group-hover:w-4");

    await user.click(menuTrigger);

    const dialog = document.getElementById("atelier-menu-dialog") as HTMLDialogElement | null;
    expect(dialog).not.toBeNull();
    expect(dialog?.hasAttribute("open")).toBe(true);
    expect(window.scrollY).toBe(420);

    // Close button renders right-pointing arrow at rest and morphs to "Close" text on hover
    const closeBtn = dialog?.querySelector('[data-slot="menu-close-button"]') as HTMLButtonElement | null;
    expect(closeBtn).not.toBeNull();
    const closeArrow = closeBtn?.querySelector('[data-slot="menu-close-arrow"]');
    expect(closeArrow).not.toBeNull();
    const arrowPaths = Array.from(closeArrow?.querySelectorAll("path") ?? []).map((p) =>
      p.getAttribute("d"),
    );
    expect(arrowPaths).toEqual(["M5 12H19", "M13 6L19 12L13 18"]);
    expect(closeBtn?.querySelector('[data-slot="menu-close-text"]')).toBeNull();

    fireEvent.pointerEnter(closeBtn as HTMLButtonElement);
    await waitFor(() => {
      expect(closeBtn?.querySelector('[data-slot="menu-close-text"]')?.textContent).toBe("Close");
    });

    fireEvent.pointerLeave(closeBtn as HTMLButtonElement);
    await waitFor(() => {
      expect(closeBtn?.querySelector('[data-slot="menu-close-arrow"]')).not.toBeNull();
    });

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(dialog?.hasAttribute("open")).toBe(false);
    });
    expect(window.scrollY).toBe(420);
    expect(document.activeElement).toBe(menuTrigger);
  });

  it("scrolls via active Lenis and focuses destination chapter section when clicking a MenuOverlay link", async () => {
    const user = userEvent.setup();
    const scrollTargets: unknown[] = [];
    const statefulLenis = {
      isStopped: false,
      stop() {
        this.isStopped = true;
      },
      start() {
        this.isStopped = false;
      },
      scrollTo(target: unknown, opts?: { force?: boolean }) {
        if (this.isStopped && !opts?.force) return;
        scrollTargets.push(target);
      },
      raf() {},
      on() {},
      destroy() {},
    };

    render(<App />);
    window.lenis = statefulLenis as unknown as typeof window.lenis;

    try {
      const menuTrigger = screen.getByRole("button", { name: /menu/i });
      await user.click(menuTrigger);
      expect(statefulLenis.isStopped).toBe(true);

      const dialog = document.getElementById("atelier-menu-dialog") as HTMLDialogElement;
      const craftLink = dialog.querySelector('a[href="#craft"]') as HTMLAnchorElement;
      expect(craftLink).not.toBeNull();

      await user.click(craftLink);

      const craftSection = document.getElementById("craft");
      await waitFor(() => {
        expect(scrollTargets).toContain(craftSection);
        expect(dialog.hasAttribute("open")).toBe(false);
      });

      expect(statefulLenis.isStopped).toBe(false);
      expect(document.activeElement).toBe(craftSection);
      expect(document.activeElement).not.toBe(menuTrigger);
    } finally {
      window.lenis = null;
    }
  });

  it("transfers keyboard focus on non-menu anchor links and re-focuses unmasked sections on Lenis onComplete", async () => {
    const user = userEvent.setup();
    let capturedOnComplete: (() => void) | undefined;
    const mockLenis = {
      isStopped: false,
      stop() {},
      start() {},
      scrollTo(_target: unknown, opts?: { onComplete?: () => void }) {
        capturedOnComplete = opts?.onComplete;
      },
      raf() {},
      on() {},
      destroy() {},
    };

    const { container } = render(<App />);
    window.lenis = mockLenis as unknown as typeof window.lenis;

    try {
      const headerConnectLink = container.querySelector(
        '[data-slot="chapter-bar"] a[href="#connect"]',
      ) as HTMLAnchorElement;
      expect(headerConnectLink).not.toBeNull();
      await user.click(headerConnectLink);
      expect(document.activeElement).toBe(document.getElementById("connect"));

      const scrollHint = container.querySelector(
        '[data-slot="hero-scroll-hint"]',
      ) as HTMLAnchorElement;
      const journeySection = document.getElementById("journey") as HTMLElement;
      expect(scrollHint).not.toBeNull();
      expect(journeySection).not.toBeNull();

      // Simulate desktop pin state where #journey cannot take focus until scroll completes
      const origFocus = journeySection.focus.bind(journeySection);
      let journeyMasked = true;
      journeySection.focus = ((options?: FocusOptions) => {
        if (!journeyMasked) origFocus(options);
      }) as typeof journeySection.focus;

      act(() => {
        document.body.focus();
      });
      await user.click(scrollHint);
      expect(document.activeElement).not.toBe(journeySection);
      expect(capturedOnComplete).toBeTypeOf("function");

      journeyMasked = false;
      act(() => {
        capturedOnComplete?.();
      });
      expect(document.activeElement).toBe(journeySection);
    } finally {
      window.lenis = null;
    }
  });

  it("enforces the Hero-Only Name Rule across ChapterBar, MenuOverlay, and Acts 01-05", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    const hero = container.querySelector('[data-act="00-hero"]');
    expect(hero).not.toBeNull();
    expect(hero?.textContent).toContain("JORGE");
    expect(hero?.textContent).toContain("BUCIO");

    const scrollHint = hero?.querySelector('[data-slot="hero-scroll-hint"]');
    expect(scrollHint).not.toBeNull();
    expect(scrollHint?.getAttribute("aria-label")).toBe("Scroll down to My Journey");
    expect((scrollHint?.textContent ?? "").trim()).toBe("");

    const plumbBar = container.querySelector('[data-slot="scroll-plumb-bar"]');
    expect(plumbBar).not.toBeNull();
    expect((plumbBar?.textContent ?? "").trim()).toBe("");
    expect(plumbBar?.querySelector(".atelier-plumb-dot")).not.toBeNull();
    expect(plumbBar?.querySelector(".atelier-plumb-arrow")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: /menu/i }));

    const nonHeroSelectors = [
      '[data-slot="chapter-bar"]',
      '[data-slot="menu-overlay"]',
      '[data-act="01-journey"]',
      '[data-act="02-craft"]',
      '[data-act="03-stack"]',
      '[data-act="04-portfolio"]',
      '[data-act="05-connect"]',
    ];

    for (const selector of nonHeroSelectors) {
      const node = container.querySelector(selector);
      expect(node, `Missing expected surface ${selector}`).not.toBeNull();
      const cleanedText = stripPermittedEmail(node?.textContent ?? "");
      expect(cleanedText).not.toMatch(/jorge|bucio/i);

      const labeledDescendants = node?.querySelectorAll("[aria-label], [alt]") ?? [];
      for (const el of labeledDescendants) {
        const aria = stripPermittedEmail(el.getAttribute("aria-label") ?? "");
        const alt = stripPermittedEmail(el.getAttribute("alt") ?? "");
        expect(aria).not.toMatch(/jorge|bucio/i);
        expect(alt).not.toMatch(/jorge|bucio/i);
      }
    }

    for (const chapterId of ["journey", "craft", "stack", "portfolio", "connect"]) {
      expect(document.getElementById(chapterId)).not.toBeNull();
    }
  });

  it("mounts desktop pinned HeroJourneyStage, enforces Hero-Only Name Rule on desktop DOM, and reverts ScrollTrigger cleanly on unmount", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    Object.defineProperty(window, "innerWidth", { value: 1440, writable: true, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 900, writable: true, configurable: true });

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(min-width: 900px)",
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));

    const { container, unmount } = render(<App />);

    await waitFor(() => {
      expect(container.querySelector('[data-slot="hero-journey-stage"]')).not.toBeNull();
    });

    expect(container.querySelector('[data-slot="monarch-plate-frame"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="monarch-plate-front"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="monarch-plate-back"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="stage-craft-layer"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="stage-stack-layer"]')).not.toBeNull();

    const heroPin = ScrollTrigger.getById("hero-journey-pin");
    expect(heroPin).toBeDefined();

    // Exactly one element per chapter ID across the entire document (zero duplicate IDs)
    for (const id of ["hero", "journey", "craft", "stack", "portfolio", "connect"]) {
      expect(container.querySelectorAll(`#${id}`)).toHaveLength(1);
    }

    // Navigating to #journey, #craft, and #stack targets their exact pinned hold offsets
    const recordedTargets: unknown[] = [];
    window.lenis = {
      isStopped: false,
      stop() {},
      start() {},
      scrollTo(target: unknown) {
        recordedTargets.push(target);
      },
      raf() {},
      on() {},
      destroy() {},
    } as unknown as typeof window.lenis;

    try {
      if (heroPin && heroPin.end > heroPin.start) {
        navigateToAnchor("#journey");
        navigateToAnchor("#craft");
        navigateToAnchor("#stack");
        expect(recordedTargets).toEqual([
          Math.round(heroPin.start + (heroPin.end - heroPin.start) * PINNED_STAGE_HOLD_PROGRESS.journey),
          Math.round(heroPin.start + (heroPin.end - heroPin.start) * PINNED_STAGE_HOLD_PROGRESS.craft),
          Math.round(heroPin.start + (heroPin.end - heroPin.start) * PINNED_STAGE_HOLD_PROGRESS.stack),
        ]);
      }

      // Navigating to #portfolio when sticky underlay is active targets the uncovered stage wrapper
      recordedTargets.length = 0;
      navigateToAnchor("#portfolio");
      expect(recordedTargets).toEqual([
        container.querySelector('[data-slot="portfolio-connect-stage"]'),
      ]);
    } finally {
      window.lenis = null;
    }

    for (const act of ["01-journey", "02-craft", "03-stack", "04-portfolio", "05-connect"]) {
      const surface = container.querySelector(`[data-act="${act}"]`);
      expect(surface).not.toBeNull();
      expect(stripPermittedEmail(surface?.textContent ?? "")).not.toMatch(/jorge|bucio/i);
    }

    unmount();

    expect(ScrollTrigger.getById("hero-journey-pin")).toBeUndefined();
    expect(errorSpy).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
