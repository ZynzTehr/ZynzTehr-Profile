import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { isDesktopStageEligible, prefersReducedMotion, ScrollTrigger } from "../lib/scrollEngine";

export interface ScrollPlumbBarProps {
  activeAct: string;
  anchorHovered?: boolean;
  introReady?: boolean;
}

const DARK_ACTS = new Set(["01-journey", "03-stack"]);
const DOCK_SCROLL_DISTANCE = 220;
const DOCKED_BAR_HEIGHT = 6;

function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function easeAtelier(t: number): number {
  const c = clamp01(t);
  return 1 - Math.pow(1 - c, 3);
}

interface AnchorMetrics {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function PlumbTrackSvg({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="100%"
      height="100%"
      viewBox="0 0 54 96"
      fill="none"
      className="h-full w-full overflow-visible"
    >
      {/* Brass top anchor pin & wider studio plumb stem */}
      <circle cx="27" cy="14" r="2.2" fill="#9f7c46" />
      <line
        x1="27"
        y1="17"
        x2="27"
        y2="78"
        stroke="rgba(33, 24, 19, 0.26)"
        strokeWidth="1.95"
        strokeLinecap="round"
      />

      {reducedMotion ? (
        <g transform="translate(0, 73)">
          <path
            d="M 27 -10.5 L 27 3.8"
            stroke="#a64028"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M 20.6 -3.2 L 27 4.2 L 33.4 -3.2"
            stroke="#a64028"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ) : (
        <g className="atelier-plumb-traveler">
          <circle
            cx="27"
            cy="0"
            r="4.5"
            fill="#a64028"
            className="atelier-plumb-dot"
          />
          <g
            stroke="#a64028"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="atelier-plumb-arrow"
          >
            <path d="M 27 -10.5 L 27 3.8" />
            <path d="M 20.6 -3.2 L 27 4.2 L 33.4 -3.2" />
          </g>
        </g>
      )}
    </svg>
  );
}

export function ScrollPlumbBar({
  activeAct,
  anchorHovered = false,
  introReady = true,
}: ScrollPlumbBarProps) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const plumbSvgWrapRef = useRef<HTMLDivElement | null>(null);
  const introWrapRef = useRef<HTMLDivElement | null>(null);
  const introTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const introCompletedRef = useRef<boolean>(false);
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => prefersReducedMotion());
  const [dockedVisual, setDockedVisual] = useState<boolean>(false);

  const anchorRef = useRef<AnchorMetrics>({
    left: 48,
    top: 355,
    width: 54,
    height: 96,
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);

  // Synchronized opening entrance matching Hero bottom-up choreography (waits for butterfly intro video before revealing)
  useLayoutEffect(() => {
    const el = introWrapRef.current;
    if (!el || introCompletedRef.current) return;
    if (prefersReducedMotion() || (typeof window !== "undefined" && window.scrollY > 12)) {
      introCompletedRef.current = true;
      el.style.transition = "";
      el.style.opacity = "1";
      el.style.transform = "";
      return;
    }

    if (!introReady) {
      el.style.transition = "none";
      el.style.opacity = "0";
      el.style.transform = "translate3d(0, 22px, 0)";
      return;
    }

    el.style.transition = "none";
    el.style.opacity = "0";
    el.style.transform = "translate3d(0, 22px, 0)";
    void el.offsetHeight;
    el.style.transition =
      "opacity 0.96s cubic-bezier(0.25, 1, 0.5, 1) 0.34s, transform 0.96s cubic-bezier(0.25, 1, 0.5, 1) 0.34s";

    const rafId = requestAnimationFrame(() => {
      if (!introCompletedRef.current) {
        el.style.opacity = "1";
        el.style.transform = "translate3d(0, 0, 0)";
      }
    });

    introTimerRef.current = setTimeout(() => {
      introCompletedRef.current = true;
      el.style.transition = "";
      el.style.transform = "";
      introTimerRef.current = null;
    }, 1440);

    return () => {
      cancelAnimationFrame(rafId);
      if (introTimerRef.current !== null) {
        clearTimeout(introTimerRef.current);
        introTimerRef.current = null;
      }
    };
  }, [introReady]);

  // Event-driven scroll morph: Hero vertical plumb bar -> top-of-window horizontal progress bar (0% -> 100%)
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    let rafId = 0;
    let running = false;
    let currentDock = window.scrollY > 12 ? clamp01(window.scrollY / DOCK_SCROLL_DISTANCE) : 0;
    let currentProgress = 0;
    let lastDockedState = currentDock > 0.86;

    const snapIntroIfScrolled = (scrollY: number) => {
      if (scrollY > 12 && !introCompletedRef.current) {
        introCompletedRef.current = true;
        if (introTimerRef.current !== null) {
          clearTimeout(introTimerRef.current);
          introTimerRef.current = null;
        }
        const wrap = introWrapRef.current;
        if (wrap) {
          wrap.style.transition = "";
          wrap.style.transform = "";
          wrap.style.opacity = "1";
        }
      }
    };

    const measureAnchor = () => {
      const slot = document.querySelector<HTMLElement>('[data-slot="hero-scroll-hint"]');
      if (!slot) return;
      const rect = slot.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const isDesktopPinned = isDesktopStageEligible();

      if (isDesktopPinned) {
        const heroPin = ScrollTrigger.getById("hero-journey-pin");
        const pinEnd =
          heroPin && heroPin.end > 0 ? heroPin.end : window.innerHeight * 5.4;
        anchorRef.current = {
          left: rect.left,
          top:
            window.scrollY <= pinEnd
              ? rect.top
              : Math.round(window.innerHeight * 0.395),
          width: rect.width,
          height: rect.height,
        };
      } else {
        anchorRef.current = {
          left: rect.left,
          top: rect.top + window.scrollY,
          width: rect.width,
          height: rect.height,
        };
      }
    };

    const computeTargets = () => {
      const scrollY = Math.max(0, window.scrollY);
      snapIntroIfScrolled(scrollY);
      if (scrollY <= DOCK_SCROLL_DISTANCE) {
        measureAnchor();
      }
      const docEl = document.documentElement;
      const maxScroll = Math.max(1, docEl.scrollHeight - window.innerHeight);
      const rawProgress = clamp01(scrollY / maxScroll);
      const targetProgress = scrollY >= maxScroll - 2 ? 1 : rawProgress;
      const targetDock = clamp01(scrollY / DOCK_SCROLL_DISTANCE);
      return { targetDock, targetProgress };
    };

    const applyFrame = (dock: number, progress: number) => {
      const bar = barRef.current;
      const fill = fillRef.current;
      const plumbWrap = plumbSvgWrapRef.current;
      if (!bar || !fill || !plumbWrap) return;

      const vw = Math.max(320, window.innerWidth || 1440);
      const anchor = anchorRef.current;

      // Two-stage trajectory:
      // Stage A (0 -> 0.58): bar rises cleanly from Hero slot up to top: 0 and compacts to 6px height
      // Stage B (0.44 -> 1.0): top bar unfurls from left to right across 100% of the viewport width
      const liftT = easeAtelier(dock / 0.58);
      const spanT = easeAtelier((dock - 0.44) / 0.56);

      const top = anchor.top * (1 - liftT);
      const left = anchor.left * (1 - liftT);
      const midWidth = Math.max(anchor.width, 112);
      const widthBeforeSpan = anchor.width + (midWidth - anchor.width) * liftT;
      const width = widthBeforeSpan + (vw - widthBeforeSpan) * spanT;
      const height = anchor.height + (DOCKED_BAR_HEIGHT - anchor.height) * liftT;

      bar.style.transform = `translate3d(${left.toFixed(2)}px, ${top.toFixed(2)}px, 0)`;
      bar.style.width = `${width.toFixed(2)}px`;
      bar.style.height = `${height.toFixed(2)}px`;
      bar.setAttribute("data-docked", dock > 0.94 ? "true" : "false");
      bar.setAttribute("data-progress", progress.toFixed(4));

      const nextDockedState = dock > 0.86;
      if (nextDockedState !== lastDockedState) {
        lastDockedState = nextDockedState;
        setDockedVisual(nextDockedState);
      }

      // Vertical plumb-dot-to-arrow fades out cleanly as the bar lifts upward
      const plumbAlpha = clamp01(1 - dock / 0.36);
      plumbWrap.style.opacity = plumbAlpha.toFixed(3);

      // Horizontal left-to-right progress fill emerges as the bar docks at the top edge
      const fillAlpha = clamp01((dock - 0.32) / 0.34);
      fill.style.opacity = fillAlpha.toFixed(3);
      fill.style.transform = `scaleX(${progress.toFixed(5)})`;
    };

    const tick = () => {
      const { targetDock, targetProgress } = computeTargets();

      if (prefersReducedMotion()) {
        currentDock = targetDock > 0.05 ? 1 : 0;
        currentProgress = targetProgress;
        applyFrame(currentDock, currentProgress);
        running = false;
        return;
      }

      currentDock += (targetDock - currentDock) * 0.13;
      currentProgress += (targetProgress - currentProgress) * 0.16;

      if (Math.abs(targetDock - currentDock) < 0.0015) {
        currentDock = targetDock;
      }
      if (Math.abs(targetProgress - currentProgress) < 0.0008) {
        currentProgress = targetProgress;
      }

      applyFrame(currentDock, currentProgress);

      if (currentDock !== targetDock || currentProgress !== targetProgress) {
        rafId = requestAnimationFrame(tick);
      } else {
        running = false;
      }
    };

    const requestSync = () => {
      snapIntroIfScrolled(Math.max(0, window.scrollY));
      if (!running) {
        running = true;
        rafId = requestAnimationFrame(tick);
      }
    };

    const onResize = () => {
      measureAnchor();
      requestSync();
    };

    measureAnchor();
    const { targetDock, targetProgress } = computeTargets();
    currentDock = prefersReducedMotion() ? (targetDock > 0.05 ? 1 : 0) : targetDock;
    currentProgress = targetProgress;
    lastDockedState = currentDock > 0.86;
    setDockedVisual(lastDockedState);
    applyFrame(currentDock, currentProgress);

    let fontsTimer: ReturnType<typeof setTimeout> | null = null;
    if (document.fonts?.ready) {
      void document.fonts.ready
        .then(() => {
          fontsTimer = setTimeout(() => {
            measureAnchor();
            requestSync();
          }, 60);
        })
        .catch(() => {});
    }

    const onScrollTriggerRefresh = () => {
      measureAnchor();
      requestSync();
    };
    ScrollTrigger.addEventListener?.("refresh", onScrollTriggerRefresh);

    window.addEventListener("scroll", requestSync, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      if (fontsTimer) clearTimeout(fontsTimer);
      ScrollTrigger.removeEventListener?.("refresh", onScrollTriggerRefresh);
      window.removeEventListener("scroll", requestSync);
      window.removeEventListener("resize", onResize);
    };
  }, [reducedMotion]);

  const isDarkGround = DARK_ACTS.has(activeAct);

  const surfaceClasses = dockedVisual
    ? isDarkGround
      ? "border-b border-[#f4eee3]/16 bg-[#251b16]/88 shadow-[0_4px_18px_rgba(10,7,5,0.36)]"
      : "border-b border-[#211813]/14 bg-[#f7f1e6]/88 shadow-[0_4px_16px_rgba(33,24,19,0.14)]"
    : anchorHovered
      ? "border border-[#211813]/42 bg-[#f7f1e6]/96 shadow-[0_18px_38px_-14px_rgba(33,24,19,0.38)] backdrop-blur-[4px]"
      : "border border-[#211813]/22 bg-[#f7f1e6]/88 shadow-[0_14px_32px_-14px_rgba(33,24,19,0.3)] backdrop-blur-[4px]";

  return (
    <div
      ref={introWrapRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      <div
        ref={barRef}
        data-slot="scroll-plumb-bar"
        data-docked="false"
        data-progress="0.0000"
        className={`pointer-events-none relative left-0 top-0 overflow-hidden transition-[background-color,border-color,box-shadow] duration-500 will-change-[transform,width,height] ${surfaceClasses}`}
      >
        {/* Left-to-right page progress fill (0% at top -> 100% full at bottom of page) */}
        <div
          ref={fillRef}
          data-slot="top-scroll-progress-fill"
          style={{
            opacity: 0,
            transform: "scaleX(0)",
            transformOrigin: "left center",
            background:
              "linear-gradient(90deg, #8c311c 0%, #a64028 58%, #d46b4a 100%)",
          }}
          className="absolute inset-0 h-full w-full will-change-transform"
        />

        {/* Hero vertical plumb track: terracotta dot glides down and morphs into downward-pointing arrow at bottom */}
        <div
          ref={plumbSvgWrapRef}
          data-slot="hero-plumb-indicator"
          className="absolute inset-0 flex items-center justify-center"
        >
          <PlumbTrackSvg reducedMotion={reducedMotion} />
        </div>
      </div>
    </div>
  );
}
