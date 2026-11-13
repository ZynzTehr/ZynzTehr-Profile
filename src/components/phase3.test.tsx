import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();

  class MockWebGLRenderer {
    domElement: HTMLCanvasElement;
    constructor(params?: { canvas?: HTMLCanvasElement }) {
      this.domElement = params?.canvas ?? document.createElement("canvas");
    }
    getContext() {
      return {} as WebGLRenderingContext;
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

import { App } from "../App";
import { gsap } from "../lib/scrollEngine";
import { Act02Craft } from "./Act02Craft";
import { Act03Stack } from "./Act03Stack";
import { HeroJourneyStage } from "./HeroJourneyStage";
import { CRAFT_DISCIPLINES, STACK_COLUMNS } from "../data/profileContent";

const originalMatchMedia = window.matchMedia;
const originalConnection = (navigator as Navigator & { connection?: unknown }).connection;

function mockViewportMatchMedia(opts: { minWidth: number; reducedMotion?: boolean }) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    let matches = false;
    if (query === "(prefers-reduced-motion: reduce)") {
      matches = Boolean(opts.reducedMotion);
    } else if (query === "(min-width: 900px)") {
      matches = opts.minWidth >= 900;
    } else if (query === "(min-width: 768px)") {
      matches = opts.minWidth >= 768;
    } else if (query === "(pointer: fine)") {
      matches = opts.minWidth >= 900;
    } else if (query === "(max-width: 767px)") {
      matches = opts.minWidth < 768;
    }
    return {
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    };
  });
}

function mockReelMatchMedia(opts: { hover: boolean; reducedMotion?: boolean; compact?: boolean }) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    let matches = false;
    if (query === "(hover: hover) and (pointer: fine)") matches = opts.hover;
    else if (query === "(prefers-reduced-motion: reduce)") matches = Boolean(opts.reducedMotion);
    else if (query === "(max-width: 1023px)") matches = Boolean(opts.compact);
    return {
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    };
  });
}

afterEach(() => {
  cleanup();
  window.matchMedia = originalMatchMedia;
  Object.defineProperty(navigator, "connection", {
    value: originalConnection,
    configurable: true,
    writable: true,
  });
});

describe("Phase 3 Ticket 06: Act02Craft, Act03Stack, and HeroJourneyStage ambient video", () => {
  it("E1: switches across all 4 disciplines via click and ArrowRight/ArrowLeft/Home/End wrapping cleanly", async () => {
    const user = userEvent.setup();
    render(<Act02Craft />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(4);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[0]).toHaveAttribute("tabindex", "0");
    expect(tabs[1]).toHaveAttribute("tabindex", "-1");
    expect(tabs[2]).toHaveAttribute("tabindex", "-1");
    expect(tabs[3]).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("heading", { name: CRAFT_DISCIPLINES[0].title })).toBeInTheDocument();

    // Switch via pointer click first and verify roving tabIndex updates
    await user.click(tabs[2]);
    await waitFor(() => {
      expect(tabs[2]).toHaveAttribute("aria-selected", "true");
      expect(tabs[2]).toHaveAttribute("tabindex", "0");
      expect(tabs[0]).toHaveAttribute("tabindex", "-1");
      expect(screen.getByRole("heading", { name: CRAFT_DISCIPLINES[2].title })).toBeInTheDocument();
    });

    await user.click(tabs[0]);
    await waitFor(() => {
      expect(tabs[0]).toHaveAttribute("aria-selected", "true");
      expect(tabs[0]).toHaveAttribute("tabindex", "0");
    });

    const tablist = screen.getByRole("tablist", { name: /engineering disciplines/i });

    // Advance 01 -> 02 -> 03 -> 04 -> wrap to 01 with roving focus assertions
    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    await waitFor(() => {
      expect(tabs[1]).toHaveAttribute("aria-selected", "true");
      expect(tabs[1]).toHaveAttribute("tabindex", "0");
      expect(document.activeElement).toBe(tabs[1]);
      expect(screen.getByRole("heading", { name: CRAFT_DISCIPLINES[1].title })).toBeInTheDocument();
    });

    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    await waitFor(() => {
      expect(tabs[2]).toHaveAttribute("aria-selected", "true");
      expect(tabs[2]).toHaveAttribute("tabindex", "0");
      expect(document.activeElement).toBe(tabs[2]);
      expect(screen.getByRole("heading", { name: CRAFT_DISCIPLINES[2].title })).toBeInTheDocument();
    });

    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    await waitFor(() => {
      expect(tabs[3]).toHaveAttribute("aria-selected", "true");
      expect(tabs[3]).toHaveAttribute("tabindex", "0");
      expect(document.activeElement).toBe(tabs[3]);
      expect(screen.getByRole("heading", { name: CRAFT_DISCIPLINES[3].title })).toBeInTheDocument();
    });

    // Wrap 04 -> 01
    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    await waitFor(() => {
      expect(tabs[0]).toHaveAttribute("aria-selected", "true");
      expect(tabs[0]).toHaveAttribute("tabindex", "0");
      expect(document.activeElement).toBe(tabs[0]);
      expect(screen.getByRole("heading", { name: CRAFT_DISCIPLINES[0].title })).toBeInTheDocument();
    });

    // End -> 04, Home -> 01, ArrowLeft -> 04
    fireEvent.keyDown(tablist, { key: "End" });
    await waitFor(() => {
      expect(tabs[3]).toHaveAttribute("aria-selected", "true");
      expect(document.activeElement).toBe(tabs[3]);
    });

    fireEvent.keyDown(tablist, { key: "Home" });
    await waitFor(() => {
      expect(tabs[0]).toHaveAttribute("aria-selected", "true");
      expect(document.activeElement).toBe(tabs[0]);
    });

    fireEvent.keyDown(tablist, { key: "ArrowLeft" });
    await waitFor(() => {
      expect(tabs[3]).toHaveAttribute("aria-selected", "true");
      expect(document.activeElement).toBe(tabs[3]);
    });
  });

  it("E2: renders all 4 columns and 18 tools in Act03Stack without shields.io badges and toggles cross-column pairings", async () => {
    const user = userEvent.setup();
    const { container } = render(<Act03Stack />);

    expect(container.querySelectorAll('img[src*="shields.io"]')).toHaveLength(0);

    const toolButtons = container.querySelectorAll("button[data-tool-id]");
    expect(toolButtons).toHaveLength(18);

    for (const column of STACK_COLUMNS) {
      expect(screen.getByRole("heading", { name: column.title })).toBeInTheDocument();
    }

    const pgButton = screen.getByRole("button", { name: "PostgreSQL" });
    const prismaButton = screen.getByRole("button", { name: "Prisma" });
    expect(pgButton).toHaveAttribute("aria-pressed", "false");

    const ledger = container.querySelector('[data-slot="stack-pairing-ledger"]');
    const relatedBuilds = container.querySelector('[data-slot="stack-related-builds"]');
    expect(relatedBuilds?.textContent).toContain("Select an instrument across the four columns");

    await user.click(pgButton);
    expect(pgButton).toHaveAttribute("aria-pressed", "true");
    // Accessible name stays stable ("PostgreSQL") even when visual Selected badge renders
    expect(screen.getByRole("button", { name: "PostgreSQL" })).toBe(pgButton);
    expect(prismaButton.textContent).toContain("Paired");

    expect(ledger?.textContent).toContain("Primary relational store for fleet records");
    expect(relatedBuilds?.textContent).toContain("Built with PostgreSQL");
    expect(relatedBuilds?.textContent).toContain("Campfire of the Damned");
    expect(relatedBuilds?.textContent).toContain("JobSeance");
    expect(relatedBuilds?.textContent).toContain("AniBeam");

    // Switching to IndexedDB updates related builds in the lower-right pocket
    const idbButton = screen.getByRole("button", { name: "IndexedDB" });
    await user.click(idbButton);
    expect(relatedBuilds?.textContent).toContain("Built with IndexedDB");
    expect(relatedBuilds?.textContent).toContain("Fleet Pulse");
    expect(relatedBuilds?.textContent).toContain("AniBeam");
    expect(
      screen.getByRole("link", { name: "Fleet Pulse live deployment" }),
    ).toHaveAttribute("href", "https://fleet-pulse-gilt.vercel.app/");
    expect(
      screen.getByRole("link", { name: "Fleet Pulse source repository" }),
    ).toHaveAttribute("rel", "noopener noreferrer");

    // Clicking the selected tool again restores full repertoire and quiet studio note
    await user.click(idbButton);
    expect(idbButton).toHaveAttribute("aria-pressed", "false");
    expect(ledger?.textContent).toContain("All eighteen 2026 instruments");
    expect(relatedBuilds?.textContent).toContain("Select an instrument across the four columns");
  });

  it("E3: omits <video> when hasHeroVideo is false, renders muted inline loop when eligible, serves phone encodes below 768px, and suppresses on reduced-motion or Save-Data", () => {
    mockViewportMatchMedia({ minWidth: 1440, reducedMotion: false });
    const { container: cFalse, unmount: uFalse } = render(<HeroJourneyStage hasHeroVideo={false} />);
    expect(cFalse.querySelector("video")).toBeNull();
    uFalse();

    const { container: cDesktop, unmount: uDesktop } = render(
      <HeroJourneyStage hasHeroVideo={true} hasHeroIntroVideo={true} />,
    );
    const introVideo = cDesktop.querySelector(
      'video[data-slot="hero-intro-video"]',
    ) as HTMLVideoElement | null;
    const transitionVideo = cDesktop.querySelector(
      'video[data-slot="hero-transition-video"]',
    ) as HTMLVideoElement | null;
    expect(introVideo).not.toBeNull();
    expect(transitionVideo).not.toBeNull();
    expect(introVideo?.muted).toBe(true);
    expect(introVideo?.hasAttribute("playsinline")).toBe(true);
    expect(introVideo?.style.opacity).toBe("1");
    expect(transitionVideo?.muted).toBe(true);
    expect(transitionVideo?.style.opacity).toBe("0");
    uDesktop();

    // Suppresses under prefers-reduced-motion: reduce
    mockViewportMatchMedia({ minWidth: 1440, reducedMotion: true });
    const { container: cReduced, unmount: uReduced } = render(<HeroJourneyStage hasHeroVideo={true} />);
    expect(cReduced.querySelector("video")).toBeNull();
    uReduced();

    // Phones (< 768px) play too, from the 960 px encodes, and the transition loop buffers lazily
    mockViewportMatchMedia({ minWidth: 390, reducedMotion: false });
    const onMobileIntroStart = vi.fn();
    const { container: cMobile, unmount: uMobile } = render(
      <HeroJourneyStage hasHeroVideo={true} hasHeroIntroVideo={true} onHeroIntroStart={onMobileIntroStart} />,
    );
    // The name and calls to action reveal alongside the clip instead of waiting for it to end
    expect(onMobileIntroStart).toHaveBeenCalledTimes(1);
    const mobileIntro = cMobile.querySelector('video[data-slot="hero-intro-video"]');
    const mobileLoop = cMobile.querySelector('video[data-slot="hero-transition-video"]');
    expect(mobileIntro?.querySelector("source")?.getAttribute("src")).toBe("/media/hero-monarch-intro-m.mp4");
    expect(mobileIntro?.querySelectorAll("source")).toHaveLength(1);
    expect(mobileLoop?.querySelector("source")?.getAttribute("src")).toBe("/media/hero-monarch-loop-m.mp4");
    expect(mobileLoop?.getAttribute("preload")).toBe("metadata");
    uMobile();

    // Suppresses when Save-Data is active
    mockViewportMatchMedia({ minWidth: 1440, reducedMotion: false });
    Object.defineProperty(navigator, "connection", {
      value: { saveData: true },
      configurable: true,
      writable: true,
    });
    const { container: cSaveData, unmount: uSaveData } = render(
      <HeroJourneyStage hasHeroVideo={true} />,
    );
    expect(cSaveData.querySelector("video")).toBeNull();
    uSaveData();
  });

  it("E3b: plays transition butterfly video once on Page 1 -> Page 2 scroll, replays on hover without restarting mid-playback, and falls back on media error", async () => {
    Object.defineProperty(navigator, "connection", {
      value: originalConnection,
      configurable: true,
      writable: true,
    });
    mockViewportMatchMedia({ minWidth: 820, reducedMotion: false });
    Object.defineProperty(window, "scrollY", {
      value: 0,
      configurable: true,
      writable: true,
    });

    const playSpy = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockImplementation(() => Promise.resolve());
    const pauseSpy = vi
      .spyOn(HTMLMediaElement.prototype, "pause")
      .mockImplementation(() => {});

    try {
      const { container, unmount } = render(
        <HeroJourneyStage hasHeroVideo={true} hasHeroIntroVideo={true} />,
      );

      const introVideo = container.querySelector(
        'video[data-slot="hero-intro-video"]',
      ) as HTMLVideoElement;
      const transitionVideo = container.querySelector(
        'video[data-slot="hero-transition-video"]',
      ) as HTMLVideoElement;
      const plateFrame = container.querySelector(
        '[data-slot="monarch-plate-frame"]',
      ) as HTMLElement;

      expect(introVideo.style.opacity).toBe("1");
      expect(transitionVideo.style.opacity).toBe("0");
      expect(transitionVideo.loop).toBe(false);
      expect(transitionVideo.autoplay).toBe(false);

      const countTransitionPlays = () =>
        playSpy.mock.instances.filter((inst) => inst === transitionVideo).length;
      expect(countTransitionPlays()).toBe(0);

      // 1. Scroll from Page 1 to Page 2 (scrollY > 18): intro video hides/pauses and transition wing-flutter plays ONCE
      window.scrollY = 48;
      fireEvent.scroll(window);
      expect(introVideo.style.opacity).toBe("0");
      expect(transitionVideo.style.opacity).toBe("1");
      expect(pauseSpy).toHaveBeenCalled();
      expect(countTransitionPlays()).toBe(1);

      // Further scroll nudges on Page 2 do NOT re-trigger transition video
      window.scrollY = 96;
      fireEvent.scroll(window);
      expect(countTransitionPlays()).toBe(1);

      // 2. While transition video is playing (currentTime = 3.4s), hovering in/out MUST NOT restart or interrupt playback
      transitionVideo.currentTime = 3.4;
      fireEvent.pointerEnter(plateFrame);
      fireEvent.pointerLeave(plateFrame);
      fireEvent.pointerEnter(plateFrame);
      expect(countTransitionPlays()).toBe(1);
      expect(transitionVideo.currentTime).toBeCloseTo(3.4, 2);

      // 3. Once transition video finishes (ended), hovering over butterfly container replays from currentTime = 0
      fireEvent.ended(transitionVideo);
      fireEvent.pointerEnter(plateFrame);
      expect(countTransitionPlays()).toBe(2);
      expect(transitionVideo.currentTime).toBe(0);

      // Hovering again while that hover replay is active does NOT restart it
      transitionVideo.currentTime = 2.1;
      fireEvent.pointerEnter(plateFrame);
      expect(countTransitionPlays()).toBe(2);
      expect(transitionVideo.currentTime).toBeCloseTo(2.1, 2);

      // 4. Scrolling back to Page 1 (scrollY = 0) resets resting pose at currentTime = 0 and re-arms Page 1 -> Page 2 single loop
      window.scrollY = 0;
      fireEvent.scroll(window);
      expect(introVideo.style.opacity).toBe("0");
      expect(transitionVideo.style.opacity).toBe("1");
      expect(transitionVideo.currentTime).toBe(0);

      window.scrollY = 64;
      fireEvent.scroll(window);
      expect(countTransitionPlays()).toBe(3);

      unmount();

      // Media decode/network error on terminal <source> (WHATWG non-bubbling error) immediately hides failed intro video and starts Hero text reveal
      window.scrollY = 0;
      const onIntroStartSpy = vi.fn();
      const { container: cError, unmount: uError } = render(
        <HeroJourneyStage
          hasHeroVideo={true}
          hasHeroIntroVideo={true}
          onHeroIntroStart={onIntroStartSpy}
        />,
      );
      const errIntro = cError.querySelector(
        'video[data-slot="hero-intro-video"]',
      ) as HTMLVideoElement;
      const terminalIntroSource = errIntro.querySelector(
        'source[type="video/mp4"]',
      ) as HTMLSourceElement;
      expect(errIntro.style.opacity).toBe("1");
      expect(onIntroStartSpy).not.toHaveBeenCalled();
      fireEvent.error(terminalIntroSource);
      expect(errIntro.style.opacity).toBe("0");
      expect(onIntroStartSpy).toHaveBeenCalledTimes(1);
      uError();

      // Blocked autoplay (e.g. Low Power Mode NotAllowedError) immediately reveals resting monarch + starts Hero text without waiting 9.5s
      playSpy.mockImplementationOnce(() =>
        Promise.reject(new DOMException("Autoplay blocked", "NotAllowedError")),
      );
      const onBlockedStartSpy = vi.fn();
      const { container: cBlocked, unmount: uBlocked } = render(
        <HeroJourneyStage
          hasHeroVideo={true}
          hasHeroIntroVideo={true}
          onHeroIntroStart={onBlockedStartSpy}
        />,
      );
      const blockedIntro = cBlocked.querySelector(
        'video[data-slot="hero-intro-video"]',
      ) as HTMLVideoElement;
      await Promise.resolve();
      expect(blockedIntro.style.opacity).toBe("0");
      expect(onBlockedStartSpy).toHaveBeenCalledTimes(1);
      uBlocked();

      // Desktop reload at scrollY = 20 (12 < scrollY <= 38, progress <= 0.008) immediately retires introVideo and shows resting loopVideo
      mockViewportMatchMedia({ minWidth: 1440, reducedMotion: false });
      Object.defineProperty(window, "innerWidth", { value: 1440, configurable: true, writable: true });
      Object.defineProperty(window, "innerHeight", { value: 900, configurable: true, writable: true });
      window.scrollY = 20;
      const onScrolledStartSpy = vi.fn();
      const { container: cScrolled, unmount: uScrolled } = render(
        <HeroJourneyStage
          hasHeroVideo={true}
          hasHeroIntroVideo={true}
          onHeroIntroStart={onScrolledStartSpy}
        />,
      );
      const scrolledIntro = cScrolled.querySelector(
        'video[data-slot="hero-intro-video"]',
      ) as HTMLVideoElement;
      const scrolledLoop = cScrolled.querySelector(
        'video[data-slot="hero-transition-video"]',
      ) as HTMLVideoElement;
      expect(scrolledIntro.style.opacity).toBe("0");
      expect(scrolledLoop.style.opacity).toBe("1");
      expect(onScrolledStartSpy).toHaveBeenCalledTimes(1);
      uScrolled();
      window.scrollY = 0;

      // Under reduced motion, SVG contour trace layer is suppressed and h1 accessible name is exact
      mockViewportMatchMedia({ minWidth: 1440, reducedMotion: true });
      const { container: cA11y, unmount: uA11y } = render(
        <HeroJourneyStage hasHeroVideo={false} />,
      );
      expect(cA11y.querySelector('[data-slot="hero-svg-trace-layer"]')).toBeNull();
      expect(screen.getByRole("heading", { level: 1 }).textContent?.replace(/\s+/g, " ").trim()).toBe(
        "JORGE BUCIO",
      );
      uA11y();
    } finally {
      window.scrollY = 0;
      playSpy.mockRestore();
      pauseSpy.mockRestore();
    }
  });

  it("E4: docks ScrollPlumbBar to the top of the window on scroll and fills left-to-right to 100% at page bottom", async () => {
    mockViewportMatchMedia({ minWidth: 1440, reducedMotion: false });
    Object.defineProperty(window, "innerWidth", { value: 1440, configurable: true, writable: true });
    Object.defineProperty(window, "innerHeight", { value: 900, configurable: true, writable: true });
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true, writable: true });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 4900,
      configurable: true,
    });

    try {
      const { container } = render(<App />);

      const plumbBar = container.querySelector('[data-slot="scroll-plumb-bar"]') as HTMLElement | null;
      const fill = container.querySelector('[data-slot="top-scroll-progress-fill"]') as HTMLElement | null;
      const scrollHint = container.querySelector('[data-slot="hero-scroll-hint"]');

      expect(plumbBar).not.toBeNull();
      expect(fill).not.toBeNull();
      expect((scrollHint?.textContent ?? "").trim()).toBe("");
      expect(plumbBar?.getAttribute("data-docked")).toBe("false");
      expect(plumbBar?.getAttribute("data-progress")).toBe("0.0000");

      // Scroll to bottom of page (maxScroll = 4900 - 900 = 4000)
      window.scrollY = 4000;
      fireEvent.scroll(window);

      await waitFor(() => {
        expect(plumbBar?.getAttribute("data-docked")).toBe("true");
        expect(plumbBar?.getAttribute("data-progress")).toBe("1.0000");
        expect(fill?.style.transform).toBe("scaleX(1.00000)");
      });
    } finally {
      window.scrollY = 0;
    }
  });

  it("E5: plays Hero butterfly intro video first while holding text hidden, then triggers directional fade & slide intro and draws Full-Stack rule last left-to-right", () => {
    mockViewportMatchMedia({ minWidth: 1440, reducedMotion: false });
    Object.defineProperty(window, "innerWidth", { value: 1440, configurable: true, writable: true });
    Object.defineProperty(window, "innerHeight", { value: 900, configurable: true, writable: true });
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true, writable: true });

    const onIntroStartSpy = vi.fn();
    const { container } = render(
      <StrictMode>
        <HeroJourneyStage
          hasHeroVideo
          hasHeroIntroVideo
          delegatedPlumbBar
          onHeroIntroStart={onIntroStartSpy}
        />
      </StrictMode>,
    );

    const introVideo = container.querySelector(
      'video[data-slot="hero-intro-video"]',
    ) as HTMLVideoElement | null;
    expect(introVideo).not.toBeNull();
    expect(introVideo?.getAttribute("poster")).toBe("/media/hero-monarch-intro-poster.webp");

    // Zero text stroke-trace overlays anywhere in the Hero DOM
    expect(container.querySelector('[data-slot="hero-svg-trace-layer"]')).toBeNull();
    expect(screen.getByRole("heading", { level: 1 }).textContent?.replace(/\s+/g, " ").trim()).toBe(
      "JORGE BUCIO",
    );

    const roleLine = container.querySelector('[data-slot="hero-role-line"]') as HTMLElement | null;
    expect(roleLine).not.toBeNull();
    expect(roleLine?.textContent).toBe("Full-Stack & Applied AI Software Engineer");
    expect(roleLine?.querySelector("em.hero-role-accent")?.textContent).toBe("Applied AI");

    const jorgeInner = container.querySelector('[data-slot="hero-first-name"] > span') as HTMLElement | null;
    expect(jorgeInner).not.toBeNull();
    expect(Number(gsap.getProperty(jorgeInner as HTMLElement, "y"))).toBeLessThan(0);
    expect(Number(gsap.getProperty(roleLine as HTMLElement, "y"))).toBeGreaterThan(0);

    const roleRule = container.querySelector(
      '[data-slot="hero-role-rule"]',
    ) as SVGPathElement | null;
    expect(roleRule).not.toBeNull();
    expect(roleRule?.getAttribute("d")).toBe("M0 3H258");
    expect(roleRule?.style.opacity).toBe("0");

    const introTl = gsap.globalTimeline
      .getChildren(false, true, true)
      .find((tl) => tl.duration() > 2);
    expect(introTl).toBeDefined();

    // 1. While butterfly intro video is playing, Hero text timeline stays paused at t = 0 with opacity 0
    expect(introTl?.paused()).toBe(true);
    expect(onIntroStartSpy).not.toHaveBeenCalled();
    expect(Number(gsap.getProperty(jorgeInner as HTMLElement, "opacity"))).toBe(0);
    expect(Number(gsap.getProperty(roleLine as HTMLElement, "opacity"))).toBe(0);

    // 2. Once butterfly intro video finishes (ended), Hero text & plumb-bar animations trigger immediately
    act(() => {
      fireEvent.ended(introVideo as HTMLVideoElement);
    });
    expect(introTl?.paused()).toBe(false);
    expect(onIntroStartSpy).toHaveBeenCalledTimes(1);

    // At t = 1.60s after butterfly lands, top and bottom words have slid into rest (y = 0, opacity = 1), while Full-Stack rule has NOT started yet
    act(() => {
      introTl?.time(1.6);
    });
    expect(Number(gsap.getProperty(jorgeInner as HTMLElement, "opacity"))).toBeCloseTo(1, 2);
    expect(Number(gsap.getProperty(roleLine as HTMLElement, "opacity"))).toBeCloseTo(1, 2);
    expect(roleRule?.style.opacity).toBe("0");

    // At t = 2.00s, the Full-Stack rule is actively drawing left-to-right LAST
    act(() => {
      introTl?.time(2.0);
    });
    expect(roleRule?.style.opacity).toBe("1");

    act(() => {
      introTl?.progress(1);
    });
  });

  it("E6: assigns data-stack-seq on Act03Stack in strict top-to-bottom, left-to-right row-major order across all 26 components", () => {
    const { container } = render(<Act03Stack embeddedInStage />);
    const seqNodes = Array.from(container.querySelectorAll<HTMLElement>("[data-stack-seq]")).sort(
      (a, b) => Number(a.dataset.stackSeq) - Number(b.dataset.stackSeq),
    );
    expect(seqNodes).toHaveLength(26);
    expect(seqNodes.map((n) => Number(n.dataset.stackSeq))).toEqual(
      Array.from({ length: 26 }, (_, i) => i),
    );

    // Seq 3..6 are column headings I, II, III, IV left-to-right
    expect(seqNodes.slice(3, 7).map((n) => n.querySelector("h3")?.textContent)).toEqual(
      STACK_COLUMNS.map((c) => c.title),
    );

    // Seq 7..24 are the 18 tools ordered row-by-row left-to-right across columns I..IV
    const orderedToolIds = seqNodes
      .slice(7, 25)
      .map((li) => li.querySelector("button")?.getAttribute("data-tool-id"));
    expect(orderedToolIds).toEqual([
      // Row 0
      "typescript",
      "nodejs",
      "indexeddb",
      "vitest",
      // Row 1
      "react-19",
      "hono",
      "claude-api",
      "playwright",
      // Row 2
      "nextjs",
      "postgresql",
      "gemini-vision",
      "github-actions",
      // Row 3
      "tailwind-css",
      "prisma",
      "vercel",
      // Rows 4..6 (Column I remaining tools)
      "threejs",
      "gsap",
      "motion",
    ]);

    // Seq 25 is the lower-right shipped builds pocket
    expect(seqNodes[25]?.getAttribute("data-slot")).toBe("stack-related-builds");
  });
});

describe("Act03Stack build reels", () => {
  const reelIn = (container: HTMLElement, projectId: string) =>
    container.querySelector(`[data-slot="build-reel"][data-project="${projectId}"]`);
  const card = (container: HTMLElement, projectId: string) =>
    container.querySelector<HTMLElement>(`li[data-project-id="${projectId}"]`)!;

  it("unfurls one reel at a time on hover after an intent delay, swaps across cards, and furls on leave, blur, or Escape", async () => {
    mockReelMatchMedia({ hover: true });
    const user = userEvent.setup();
    const { container } = render(<Act03Stack embeddedInStage />);
    await user.click(screen.getByRole("button", { name: "PostgreSQL" }));

    expect(container.querySelectorAll('[data-slot="build-reel-toggle"]')).toHaveLength(0);

    await user.hover(card(container, "campfire"));
    expect(reelIn(container, "campfire")).toBeNull();
    await waitFor(() => expect(reelIn(container, "campfire")).not.toBeNull());
    const reel = reelIn(container, "campfire")!;
    expect(reel).toHaveAttribute("aria-hidden", "true");
    // Desktop hangs one scroll from the top of the chapter, outside the cards
    expect(reel).toHaveAttribute("data-placement", "hang");
    expect(reel.closest("li")).toBeNull();
    const video = reel.querySelector("video")!;
    expect(video.getAttribute("src")).toMatch(/^\/media\/builds\/campfire\/reel-[0-9a-f]{10}\.mp4$/);
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute("playsinline");
    expect(reel.querySelector("img")?.getAttribute("src")).toMatch(/\.webp$/);

    await user.hover(card(container, "job-seance"));
    await waitFor(() => {
      expect(reelIn(container, "job-seance")).not.toBeNull();
      expect(reelIn(container, "campfire")).toBeNull();
    });
    expect(container.querySelectorAll('[data-slot="build-reel"]')).toHaveLength(1);

    await user.unhover(card(container, "job-seance"));
    await waitFor(() => expect(container.querySelector('[data-slot="build-reel"]')).toBeNull());

    act(() => {
      screen.getByRole("link", { name: "AniBeam live deployment" }).focus();
    });
    await waitFor(() => expect(reelIn(container, "ani-beam")).not.toBeNull());
    act(() => {
      screen.getByRole("link", { name: "AniBeam source repository" }).focus();
    });
    expect(reelIn(container, "ani-beam")).not.toBeNull();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(container.querySelector('[data-slot="build-reel"]')).toBeNull());
  });

  it("resets the open reel when the selected instrument changes", async () => {
    mockReelMatchMedia({ hover: true });
    const user = userEvent.setup();
    const { container } = render(<Act03Stack embeddedInStage />);
    await user.click(screen.getByRole("button", { name: "PostgreSQL" }));
    act(() => {
      screen.getByRole("link", { name: "JobSeance live deployment" }).focus();
    });
    await waitFor(() => expect(reelIn(container, "job-seance")).not.toBeNull());

    await user.click(screen.getByRole("button", { name: "Prisma" }));
    await waitFor(() => expect(container.querySelector('[data-slot="build-reel"]')).toBeNull());
  });

  it("gives touch pointers a pressed-state Reel toggle that closes on a second tap or a tap outside", async () => {
    mockReelMatchMedia({ hover: false });
    const user = userEvent.setup();
    const { container } = render(<Act03Stack embeddedInStage />);
    await user.click(screen.getByRole("button", { name: "PostgreSQL" }));

    const toggles = container.querySelectorAll('[data-slot="build-reel-toggle"]');
    expect(toggles).toHaveLength(3);
    const toggle = screen.getByRole("button", { name: "Campfire of the Damned reel" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    // Hover does nothing on touch-first devices
    await user.hover(card(container, "campfire"));
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(reelIn(container, "campfire")).toBeNull();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(reelIn(container, "campfire")).not.toBeNull();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await waitFor(() => expect(reelIn(container, "campfire")).toBeNull());

    await user.click(screen.getByRole("button", { name: "AniBeam reel" }));
    expect(reelIn(container, "ani-beam")).not.toBeNull();
    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(reelIn(container, "ani-beam")).toBeNull());
  });

  it("renders the still only, with no video, under reduced motion", async () => {
    mockReelMatchMedia({ hover: true, reducedMotion: true });
    const user = userEvent.setup();
    const { container } = render(<Act03Stack embeddedInStage />);
    await user.click(screen.getByRole("button", { name: "IndexedDB" }));
    act(() => {
      screen.getByRole("link", { name: "Fleet Pulse live deployment" }).focus();
    });
    await waitFor(() => expect(reelIn(container, "fleet-pulse")).not.toBeNull());
    const reel = reelIn(container, "fleet-pulse")!;
    expect(reel.querySelector("video")).toBeNull();
    expect(reel.querySelector("img")).not.toBeNull();
    expect(reel.textContent).toContain("Still");
  });

  it("unrolls inline inside the card on compact layouts instead of hanging from the top", async () => {
    mockReelMatchMedia({ hover: false, compact: true });
    const user = userEvent.setup();
    const { container } = render(<Act03Stack />);
    await user.click(screen.getByRole("button", { name: "IndexedDB" }));
    await user.click(screen.getByRole("button", { name: "Fleet Pulse reel" }));
    const inline = reelIn(container, "fleet-pulse");
    expect(inline).toHaveAttribute("data-placement", "inline");
    expect(inline?.closest('li[data-project-id="fleet-pulse"]')).not.toBeNull();
  });
});
