import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";

let pluginsRegistered = false;

export function ensureGsapPlugins(): void {
  if (pluginsRegistered) return;
  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, CustomEase, Flip);
  CustomEase.create("atelier-silk", "0.22, 1, 0.36, 1");
  CustomEase.create("atelier-mat", "0.16, 1, 0.3, 1");
  pluginsRegistered = true;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function canPlayAmbientLoop(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  if (prefersReducedMotion()) {
    return false;
  }
  if (typeof navigator !== "undefined") {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData) {
      return false;
    }
  }
  return window.matchMedia("(min-width: 768px)").matches;
}

export function isFineDesktopViewport(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return (
    window.matchMedia("(pointer: fine)").matches &&
    window.matchMedia("(min-width: 900px)").matches
  );
}

export function isDesktopStageEligible(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  if (prefersReducedMotion()) {
    return false;
  }
  if (window.innerHeight > 0 && window.innerHeight < 680) {
    return false;
  }
  return window.matchMedia("(min-width: 900px)").matches;
}

export const PINNED_STAGE_HOLD_PROGRESS: Readonly<Record<string, number>> = {
  journey: 0.235,
  craft: 0.535,
  stack: 0.955,
};

export interface ScrollEngineHandle {
  lenis: Lenis | null;
  destroy: () => void;
}

export function initScrollEngine(): ScrollEngineHandle {
  ensureGsapPlugins();

  if (typeof window === "undefined") {
    return { lenis: null, destroy: () => {} };
  }

  window.ScrollTrigger = ScrollTrigger;

  let lenis: Lenis | null = null;
  let tickerCallback: ((time: number) => void) | null = null;

  if (!prefersReducedMotion() && isFineDesktopViewport() && typeof ResizeObserver !== "undefined") {
    lenis = new Lenis({
      syncTouch: false,
      lerp: 0.095,
      wheelMultiplier: 0.95,
    });
    lenis.on("scroll", ScrollTrigger.update);
    tickerCallback = (time: number) => {
      lenis?.raf(time * 1000);
    };
    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(0);
    window.lenis = lenis;
  } else {
    window.lenis = null;
  }

  let disposed = false;
  if (typeof document !== "undefined" && document.fonts?.ready) {
    void document.fonts.ready
      .then(() => {
        if (!disposed) {
          ScrollTrigger.refresh();
        }
      })
      .catch(() => {});
  }

  return {
    lenis,
    destroy: () => {
      disposed = true;
      if (tickerCallback) {
        gsap.ticker.remove(tickerCallback);
      }
      if (lenis) {
        lenis.destroy();
      }
      if (window.lenis === lenis) {
        window.lenis = null;
      }
    },
  };
}

function resolveAnchorElement(href: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const id = href.replace(/^#/, "");
  if (!id) return null;

  return id === "hero"
    ? (document.querySelector<HTMLElement>('[data-act="00-hero"]') ?? document.getElementById("hero"))
    : document.getElementById(id);
}

export function focusAnchorTarget(href: string): boolean {
  const target = resolveAnchorElement(href);
  if (!target) return false;
  if (!target.hasAttribute("tabindex")) {
    target.setAttribute("tabindex", "-1");
  }
  target.focus({ preventScroll: true });
  return document.activeElement === target;
}

let activeNavToken = 0;
let activeFocusTimer: ReturnType<typeof setTimeout> | null = null;

function clearFocusRetry(): void {
  if (activeFocusTimer !== null) {
    clearTimeout(activeFocusTimer);
    activeFocusTimer = null;
  }
}

function focusAnchorWithRetry(href: string, navToken: number, maxAttempts = 12): void {
  clearFocusRetry();
  let attempts = 0;

  const attempt = () => {
    activeFocusTimer = null;
    if (navToken !== activeNavToken || typeof document === "undefined") return;
    if (document.querySelector("dialog[open]")) {
      if (++attempts < maxAttempts) {
        activeFocusTimer = setTimeout(attempt, 100);
      }
      return;
    }
    const target = resolveAnchorElement(href);
    if (!target || target.contains(document.activeElement)) return;
    if (focusAnchorTarget(href)) return;
    if (++attempts < maxAttempts) {
      activeFocusTimer = setTimeout(attempt, 100);
    }
  };

  attempt();
}

export interface NavigateToAnchorOptions {
  focusTarget?: boolean;
}

export function navigateToAnchor(href: string, options: NavigateToAnchorOptions = {}): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const id = href.replace(/^#/, "");
  if (!id) return;

  const { focusTarget = true } = options;
  const navToken = ++activeNavToken;
  clearFocusRetry();
  const reduced = prefersReducedMotion();
  const lenis = window.lenis ?? null;

  const onScrollComplete = () => {
    focusAnchorWithRetry(href, navToken, 10);
  };

  const applyImmediateOrDeferredFocus = (usedLenis: boolean) => {
    if (focusTarget) {
      if (!focusAnchorTarget(href) && !reduced) {
        focusAnchorWithRetry(href, navToken, 18);
      }
    } else if (!usedLenis && !reduced) {
      activeFocusTimer = setTimeout(onScrollComplete, 550);
    }
  };

  if (id === "hero") {
    const usedLenis = Boolean(lenis && !reduced);
    if (usedLenis && lenis) {
      lenis.scrollTo(0, { duration: 1.2, force: true, onComplete: onScrollComplete });
    } else {
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    }
    window.history.replaceState(null, "", "#hero");
    applyImmediateOrDeferredFocus(usedLenis);
    return;
  }

  const pinnedHoldProgress = PINNED_STAGE_HOLD_PROGRESS[id];
  if (typeof pinnedHoldProgress === "number") {
    const heroPin = ScrollTrigger.getById("hero-journey-pin");
    if (heroPin && heroPin.end > heroPin.start) {
      const targetY = Math.round(
        heroPin.start + (heroPin.end - heroPin.start) * pinnedHoldProgress,
      );
      const usedLenis = Boolean(lenis && !reduced);
      if (usedLenis && lenis) {
        lenis.scrollTo(targetY, { duration: 1.2, force: true, onComplete: onScrollComplete });
      } else {
        window.scrollTo({ top: targetY, behavior: reduced ? "auto" : "smooth" });
      }
      window.history.replaceState(null, "", `#${id}`);
      applyImmediateOrDeferredFocus(usedLenis);
      return;
    }
  }

  const element = document.getElementById(id);
  if (!element) return;

  // When Act04Portfolio is held sticky beneath Act05Connect, target the stage wrapper's uncovered top
  const scrollTargetEl =
    id === "portfolio" && element.getAttribute("data-sticky-underlay") === "true"
      ? (document.querySelector<HTMLElement>('[data-slot="portfolio-connect-stage"]') ?? element)
      : element;

  const usedLenis = Boolean(lenis && !reduced);
  if (usedLenis && lenis) {
    lenis.scrollTo(scrollTargetEl, { duration: 1.2, force: true, onComplete: onScrollComplete });
  } else if (typeof scrollTargetEl.scrollIntoView === "function") {
    scrollTargetEl.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  } else {
    window.scrollTo({
      top: scrollTargetEl.getBoundingClientRect().top + window.scrollY,
      behavior: reduced ? "auto" : "smooth",
    });
  }
  window.history.replaceState(null, "", `#${id}`);
  applyImmediateOrDeferredFocus(usedLenis);
}

export { gsap, ScrollTrigger, SplitText, DrawSVGPlugin, CustomEase, Flip };
