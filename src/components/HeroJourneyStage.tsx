import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  HERO_CONTENT,
  JOURNEY_CONTENT,
  MONARCH_IMAGE_ALT,
  PORTFOLIO_URL,
} from "../data/profileContent";
import {
  canPlayAmbientLoop,
  ensureGsapPlugins,
  gsap,
  isDesktopStageEligible,
  navigateToAnchor,
  prefersReducedMotion,
  ScrollTrigger,
  SplitText,
  revealHeadingLines,
} from "../lib/scrollEngine";
import { Act02Craft } from "./Act02Craft";
import { Act03Stack } from "./Act03Stack";
import { MagneticAction } from "./MagneticAction";
import { PlumbTrackSvg } from "./ScrollPlumbBar";

const MonarchReliefCanvas = lazy(() =>
  import("../canvas/MonarchReliefCanvas").then((m) => ({
    default: m.MonarchReliefCanvas,
  })),
);

export interface HeroJourneyStageProps {
  hasHeroVideo?: boolean;
  hasHeroIntroVideo?: boolean;
  delegatedPlumbBar?: boolean;
  onScrollHintHoverChange?: (hovered: boolean) => void;
  onActiveActChange?: (actAttr: string) => void;
  onHeroIntroStart?: () => void;
}

const DEFAULT_HAS_HERO_VIDEO =
  typeof __HAS_HERO_VIDEO__ !== "undefined" ? __HAS_HERO_VIDEO__ : false;

const DEFAULT_HAS_HERO_INTRO_VIDEO =
  typeof __HAS_HERO_INTRO_VIDEO__ !== "undefined" ? __HAS_HERO_INTRO_VIDEO__ : false;

function resolvePinnedStageAct(progress: number): string {
  if (progress < 0.12) return "00-hero";
  if (progress < 0.36) return "01-journey";
  if (progress < 0.69) return "02-craft";
  return "03-stack";
}

function renderRoleLine(roleLine: string, accentClass: string) {
  const token = "Applied AI";
  const index = roleLine.indexOf(token);
  if (index === -1) return roleLine;
  const before = roleLine.slice(0, index);
  const after = roleLine.slice(index + token.length);
  return (
    <>
      {before}
      <em className={`hero-role-accent font-editorial-italic font-normal ${accentClass}`}>
        {token}
      </em>
      {after}
    </>
  );
}

function renderJourneyAccent(headlineAccent: string, splitTailBlock: boolean) {
  const token = "2024,";
  const index = headlineAccent.indexOf(token);
  if (index === -1) return headlineAccent;
  const before = headlineAccent.slice(0, index);
  const after = headlineAccent.slice(index + token.length).trimStart();
  return (
    <>
      {before}
      <em className="font-editorial-italic font-normal text-[var(--accent-monarch-light)]">
        {token}
      </em>{" "}
      {splitTailBlock ? <span className="block">{after}</span> : after}
    </>
  );
}

export function HeroJourneyStage({
  hasHeroVideo = DEFAULT_HAS_HERO_VIDEO,
  hasHeroIntroVideo,
  delegatedPlumbBar = false,
  onScrollHintHoverChange,
  onActiveActChange,
  onHeroIntroStart,
}: HeroJourneyStageProps) {
  const effectiveHasIntroVideo =
    hasHeroIntroVideo ?? (hasHeroVideo ? DEFAULT_HAS_HERO_INTRO_VIDEO : false);

  const [desktopPinned, setDesktopPinned] = useState<boolean>(() => isDesktopStageEligible());
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => prefersReducedMotion());
  const [ambientVideoEligible, setAmbientVideoEligible] = useState<boolean>(() =>
    canPlayAmbientLoop(),
  );
  const [introSettled, setIntroSettled] = useState<boolean>(() => prefersReducedMotion());

  const showLoopVideo = hasHeroVideo && ambientVideoEligible;
  const showIntroVideo = effectiveHasIntroVideo && ambientVideoEligible;
  const anyHeroVideoActive = showLoopVideo || showIntroVideo;

  // Outer refs owned by the desktop pinned 4-Act ScrollTrigger timeline
  const stageRef = useRef<HTMLDivElement | null>(null);
  const stackedRootRef = useRef<HTMLDivElement | null>(null);
  const matBorderRef = useRef<HTMLDivElement | null>(null);
  const plateFrameRef = useRef<HTMLDivElement | null>(null);
  const frontFaceRef = useRef<HTMLDivElement | null>(null);
  const frontWhiteWashRef = useRef<HTMLDivElement | null>(null);
  const backFaceRef = useRef<HTMLDivElement | null>(null);
  const backCardBorderRef = useRef<HTMLDivElement | null>(null);
  const backOliveLayerRef = useRef<HTMLDivElement | null>(null);
  const heroImgRef = useRef<HTMLImageElement | null>(null);
  const introVideoRef = useRef<HTMLVideoElement | null>(null);
  const loopVideoRef = useRef<HTMLVideoElement | null>(null);
  const shaderWrapRef = useRef<HTMLDivElement | null>(null);
  const heroScrimRef = useRef<HTMLDivElement | null>(null);
  const heroScrimIntroRef = useRef<HTMLDivElement | null>(null);
  const heroOverlayRef = useRef<HTMLElement | null>(null);
  const jorgeMarkRef = useRef<HTMLSpanElement | null>(null);
  const bucioMarkRef = useRef<HTMLSpanElement | null>(null);
  const heroScrollHintRef = useRef<HTMLDivElement | null>(null);
  const scrollHintLinkRef = useRef<HTMLAnchorElement | null>(null);
  const heroCopyRef = useRef<HTMLDivElement | null>(null);
  const heroCtaRef = useRef<HTMLDivElement | null>(null);
  const espressoWipeRef = useRef<HTMLDivElement | null>(null);
  const limewashGroundRef = useRef<HTMLDivElement | null>(null);
  const journeySectionRef = useRef<HTMLElement | null>(null);
  const journeyCenterSlotRef = useRef<HTMLDivElement | null>(null);
  const journeyHeadingLeftRef = useRef<HTMLHeadingElement | null>(null);
  const journeyHeadingRightRef = useRef<HTMLParagraphElement | null>(null);
  const journeyLeftRef = useRef<HTMLDivElement | null>(null);
  const journeyRightRef = useRef<HTMLDivElement | null>(null);
  const craftStageWrapRef = useRef<HTMLDivElement | null>(null);
  const stackStageWrapRef = useRef<HTMLDivElement | null>(null);

  // Inner refs owned exclusively by the page-load directional fade & slide intro
  const jorgeIntroRef = useRef<HTMLSpanElement | null>(null);
  const bucioIntroRef = useRef<HTMLSpanElement | null>(null);
  const scrollHintIntroRef = useRef<HTMLDivElement | null>(null);
  const roleIntroRef = useRef<HTMLParagraphElement | null>(null);
  const roleRulePathRef = useRef<SVGPathElement | null>(null);
  const leadIntroRef = useRef<HTMLParagraphElement | null>(null);
  const handIntroRef = useRef<HTMLParagraphElement | null>(null);
  const ctaIntroRef = useRef<HTMLDivElement | null>(null);

  const progressRef = useRef<number>(0);
  const pinnedProgressRef = useRef<number>(0);
  const wasPinnedRef = useRef<boolean>(false);
  const introPlayedRef = useRef<boolean>(false);
  const heroTextStartedRef = useRef<boolean>(false);
  const introTlRef = useRef<gsap.core.Timeline | null>(null);
  const introEndedRef = useRef<boolean>(!showIntroVideo);
  const isLoopPlayingRef = useRef<boolean>(false);
  const hasPlayedTransitionLoopRef = useRef<boolean>(false);
  const loopCulledRef = useRef<boolean>(false);
  const videoPhaseRef = useRef<"rest" | "journey" | "culled">("rest");

  const onHeroIntroStartRef = useRef(onHeroIntroStart);
  onHeroIntroStartRef.current = onHeroIntroStart;

  const startHeroTextReveal = useCallback(() => {
    if (!heroTextStartedRef.current) {
      heroTextStartedRef.current = true;
      onHeroIntroStartRef.current?.();
    }
    const tl = introTlRef.current;
    if (tl && tl.paused() && tl.progress() < 1) {
      tl.play(0);
    }
  }, []);

  const retireIntroVideoToRest = useCallback(() => {
    introEndedRef.current = true;
    const introVid = introVideoRef.current;
    if (introVid) {
      introVid.style.opacity = "0";
      try {
        if (!introVid.paused) {
          introVid.pause();
        }
      } catch {
        // Ignore media pause errors
      }
    }
    const loopVid = loopVideoRef.current;
    if (loopVid && videoPhaseRef.current === "rest") {
      loopVid.style.opacity = "1";
      try {
        if (!loopVid.paused) {
          loopVid.pause();
        }
        loopVid.currentTime = 0;
      } catch {
        // Ignore media seek errors
      }
    }
  }, []);

  const snapHeroIntroToEnd = useCallback(() => {
    if (!heroTextStartedRef.current) {
      heroTextStartedRef.current = true;
      onHeroIntroStartRef.current?.();
    }
    if (!introEndedRef.current) {
      retireIntroVideoToRest();
    }
    if (introPlayedRef.current) return;
    introPlayedRef.current = true;
    const tl = introTlRef.current;
    if (tl && tl.progress() < 1) {
      tl.progress(1);
    }
    setIntroSettled(true);
  }, [retireIntroVideoToRest]);

  // Play-once on Page 1 -> Page 2 transition + re-trigger on hover ONLY when not currently playing
  const triggerButterflyLoopPlayback = useCallback(() => {
    const loopVid = loopVideoRef.current;
    if (!loopVid || !showLoopVideo) return;
    if (isLoopPlayingRef.current) return;

    const introVid = introVideoRef.current;
    if (introVid) {
      introVid.style.opacity = "0";
      try {
        introVid.pause();
      } catch {
        // Ignore media pause errors
      }
    }

    loopVid.style.opacity = "1";
    isLoopPlayingRef.current = true;

    try {
      loopVid.currentTime = 0;
    } catch {
      // Ignore seek errors while metadata loads
    }

    try {
      const playPromise = loopVid.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          isLoopPlayingRef.current = false;
        });
      }
    } catch {
      isLoopPlayingRef.current = false;
    }
  }, [showLoopVideo]);

  const handleLoopVideoEnded = useCallback(() => {
    isLoopPlayingRef.current = false;
  }, []);

  const handleLoopVideoPause = useCallback(() => {
    isLoopPlayingRef.current = false;
  }, []);

  const handleLoopVideoError = useCallback(() => {
    isLoopPlayingRef.current = false;
    if (loopVideoRef.current) {
      loopVideoRef.current.style.opacity = "0";
    }
  }, []);

  const handleJourneyButterflyHover = useCallback(() => {
    if (!introEndedRef.current || loopCulledRef.current) return;
    triggerButterflyLoopPlayback();
  }, [triggerButterflyLoopPlayback]);

  const syncDualVideosForScroll = useCallback(
    (inHeroToJourney: boolean, frontFaceCulled = false) => {
      const introVid = introVideoRef.current;
      const loopVid = loopVideoRef.current;
      loopCulledRef.current = frontFaceCulled;

      if (frontFaceCulled) {
        if (videoPhaseRef.current !== "culled") {
          videoPhaseRef.current = "culled";
          isLoopPlayingRef.current = false;
          try {
            introVid?.pause();
            loopVid?.pause();
          } catch {
            // Ignore media pause errors in headless runners
          }
        }
        return;
      }

      if (inHeroToJourney) {
        videoPhaseRef.current = "journey";
        if (!introEndedRef.current) {
          introEndedRef.current = true;
          if (introVid) {
            introVid.style.opacity = "0";
            try {
              introVid.pause();
            } catch {
              // Ignore media pause errors
            }
          }
        }
        if (loopVid) {
          loopVid.style.opacity = "1";
        }
        if (!hasPlayedTransitionLoopRef.current) {
          hasPlayedTransitionLoopRef.current = true;
          triggerButterflyLoopPlayback();
        }
        return;
      }

      // Resting at Page 1 top: reset the transition latch so future Page 1 -> Page 2 transitions play one loop
      hasPlayedTransitionLoopRef.current = false;
      if (videoPhaseRef.current !== "rest") {
        videoPhaseRef.current = "rest";
        if (introEndedRef.current) {
          isLoopPlayingRef.current = false;
          if (introVid) {
            introVid.style.opacity = "0";
          }
          if (loopVid) {
            loopVid.style.opacity = "1";
            try {
              loopVid.pause();
              loopVid.currentTime = 0;
            } catch {
              // Ignore media seek errors
            }
          }
        }
      }
    },
    [triggerButterflyLoopPlayback],
  );

  const handleIntroVideoEnded = useCallback(() => {
    retireIntroVideoToRest();
    startHeroTextReveal();
  }, [retireIntroVideoToRest, startHeroTextReveal]);

  const handleIntroVideoError = useCallback(() => {
    retireIntroVideoToRest();
    startHeroTextReveal();
  }, [retireIntroVideoToRest, startHeroTextReveal]);

  const syncScrollHintInteractivity = useCallback(
    (liftedAway: boolean) => {
      if (!delegatedPlumbBar) return;
      const link = scrollHintLinkRef.current;
      if (!link) return;

      if (liftedAway) {
        if (typeof document !== "undefined" && document.activeElement === link) {
          link.blur();
        }
        link.style.visibility = "hidden";
        link.style.pointerEvents = "none";
        link.tabIndex = -1;
        onScrollHintHoverChange?.(false);
      } else {
        link.style.visibility = "";
        link.style.pointerEvents = "";
        link.tabIndex = 0;
      }
    },
    [delegatedPlumbBar, onScrollHintHoverChange],
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const widthMq = window.matchMedia("(min-width: 900px)");
    const tabletMq = window.matchMedia("(min-width: 768px)");
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncFlags = () => {
      setReducedMotion(motionMq.matches);
      setDesktopPinned(isDesktopStageEligible());
      setAmbientVideoEligible(canPlayAmbientLoop());
    };

    syncFlags();
    widthMq.addEventListener?.("change", syncFlags);
    tabletMq.addEventListener?.("change", syncFlags);
    motionMq.addEventListener?.("change", syncFlags);
    window.addEventListener("resize", syncFlags, { passive: true });

    return () => {
      widthMq.removeEventListener?.("change", syncFlags);
      tabletMq.removeEventListener?.("change", syncFlags);
      motionMq.removeEventListener?.("change", syncFlags);
      window.removeEventListener("resize", syncFlags);
    };
  }, []);

  // Warm-cache the WebGL canvas module without suspending during the opening Hero intro
  useEffect(() => {
    const timer = setTimeout(() => {
      void import("../canvas/MonarchReliefCanvas");
    }, 320);
    return () => clearTimeout(timer);
  }, []);

  // Sync dual-video state when stacked vs desktop branch remounts <video> elements
  useLayoutEffect(() => {
    videoPhaseRef.current = "rest";
    isLoopPlayingRef.current = false;
    loopCulledRef.current = false;
    if (!showIntroVideo) {
      introEndedRef.current = true;
    }
    if (introEndedRef.current) {
      retireIntroVideoToRest();
    }
    if (showLoopVideo && typeof window !== "undefined") {
      if (desktopPinned) {
        syncDualVideosForScroll(
          pinnedProgressRef.current > 0.008 && pinnedProgressRef.current < 0.355,
          pinnedProgressRef.current >= 0.355,
        );
      } else {
        syncDualVideosForScroll(window.scrollY > 12, false);
      }
    }
  }, [desktopPinned, retireIntroVideoToRest, showIntroVideo, showLoopVideo, syncDualVideosForScroll]);

  // Safety guard for the opening butterfly flight video (catches blocked autoplay / Low Power Mode NotAllowedError or stalled decode)
  useEffect(() => {
    if (!showIntroVideo || introEndedRef.current) return;

    const introVid = introVideoRef.current;
    if (introVid) {
      try {
        const playPromise = introVid.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch((err: unknown) => {
            const errName =
              err && typeof err === "object" && "name" in err
                ? String((err as { name?: unknown }).name)
                : "";
            if (errName === "AbortError") {
              return;
            }
            if (!introEndedRef.current) {
              handleIntroVideoError();
            }
          });
        }
      } catch {
        if (!introEndedRef.current) {
          handleIntroVideoError();
        }
      }
    }

    const fallbackTimer = setTimeout(() => {
      if (!introEndedRef.current) {
        handleIntroVideoEnded();
      }
    }, 9500);

    return () => {
      clearTimeout(fallbackTimer);
    };
  }, [desktopPinned, handleIntroVideoEnded, handleIntroVideoError, showIntroVideo]);

  // Stacked scroll handler (< 900px or short viewports)
  useEffect(() => {
    if (desktopPinned) return;

    const onScroll = () => {
      if (window.scrollY > 12) {
        snapHeroIntroToEnd();
      }
      syncScrollHintInteractivity(window.scrollY > 36);
      if (showLoopVideo || showIntroVideo) {
        syncDualVideosForScroll(window.scrollY > 12, false);
      }
    };

    syncScrollHintInteractivity(typeof window !== "undefined" && window.scrollY > 36);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [
    desktopPinned,
    showIntroVideo,
    showLoopVideo,
    snapHeroIntroToEnd,
    syncDualVideosForScroll,
    syncScrollHintInteractivity,
  ]);

  // Stacked (phone) choreography: the espresso Journey sheet slides over a sticky hero that
  // recedes beneath it, the running stitch draws in, and Journey's copy rises line by line.
  // Native scroll throughout (no pinning on touch); reduced motion keeps the static stack.
  useLayoutEffect(() => {
    if (desktopPinned || reducedMotion) return;
    const root = stackedRootRef.current;
    const hero = root?.querySelector<HTMLElement>('[data-act="00-hero"]');
    const journey = root?.querySelector<HTMLElement>('[data-act="01-journey"]');
    if (!root || !hero || !journey) return;

    ensureGsapPlugins();
    // A hero taller than the screen sticks by its bottom edge so nothing is skipped
    const syncStickyTop = () => {
      hero.style.top = `${Math.min(0, window.innerHeight - hero.offsetHeight)}px`;
    };
    hero.style.position = "sticky";
    syncStickyTop();
    window.addEventListener("resize", syncStickyTop);

    const ctx = gsap.context(() => {
      const recede = hero.querySelector<HTMLElement>("[data-mobile-recede]");
      const dim = hero.querySelector<HTMLElement>("[data-mobile-dim]");
      gsap
        .timeline({
          scrollTrigger: { trigger: journey, start: "top bottom", end: "top top", scrub: 0.35 },
          defaults: { ease: "none" },
        })
        .to(recede, { scale: 0.92, yPercent: -3, transformOrigin: "50% 35%" }, 0)
        .to(recede, { opacity: 0, ease: "power2.in" }, 0)
        .to(dim, { opacity: 0.6 }, 0);

      const stitch = journey.querySelector<SVGPathElement>("[data-mobile-stitch]");
      if (stitch) {
        gsap.from(stitch, {
          drawSVG: "0%",
          ease: "none",
          scrollTrigger: { trigger: journey, start: "top bottom", end: "top 45%", scrub: 0.35 },
        });
      }

      const heading = journey.querySelector<HTMLElement>("#journey-heading-stacked");
      if (heading) revealHeadingLines(heading, heading, "top 84%");
      const rise = journey.querySelectorAll<HTMLElement>("[data-mobile-rise]");
      rise.forEach((el) => {
        gsap.from(el, {
          y: 26,
          opacity: 0,
          duration: 0.85,
          ease: "atelier-silk",
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
        });
      });
    }, root);

    return () => {
      ctx.revert();
      window.removeEventListener("resize", syncStickyTop);
      hero.style.position = "";
      hero.style.top = "";
    };
  }, [desktopPinned, reducedMotion]);

  // Page 1 (00-hero) directional fade & slide intro: waits for butterfly intro video to finish, then animates top text down, bottom copy/CTAs up, and Full-Stack rule left-to-right last
  useLayoutEffect(() => {
    if (reducedMotion) {
      heroTextStartedRef.current = true;
      onHeroIntroStartRef.current?.();
      setIntroSettled(true);
      return;
    }
    if (introPlayedRef.current) {
      heroTextStartedRef.current = true;
      onHeroIntroStartRef.current?.();
      return;
    }

    const scopeEl = desktopPinned ? stageRef.current : stackedRootRef.current;
    const jorgeIntro = jorgeIntroRef.current;
    const bucioIntro = bucioIntroRef.current;
    const scrollHintIntro = scrollHintIntroRef.current;
    const roleIntro = roleIntroRef.current;
    const roleRule = roleRulePathRef.current;
    const leadIntro = leadIntroRef.current;
    const handIntro = handIntroRef.current;
    const ctaIntro = ctaIntroRef.current;
    const scrimIntro = heroScrimIntroRef.current;

    if (!scopeEl || !jorgeIntro || !bucioIntro || !roleIntro || !leadIntro || !ctaIntro) {
      return;
    }

    if (typeof window !== "undefined" && window.scrollY > 12) {
      snapHeroIntroToEnd();
      return;
    }

    ensureGsapPlugins();

    const waitForButterflyVideo =
      showIntroVideo &&
      !introEndedRef.current &&
      !heroTextStartedRef.current &&
      (typeof window === "undefined" || window.scrollY <= 12);

    if (!waitForButterflyVideo && !heroTextStartedRef.current) {
      heroTextStartedRef.current = true;
      onHeroIntroStartRef.current?.();
    }

    const ctx = gsap.context(() => {
      const clearTargets = [
        jorgeIntro,
        bucioIntro,
        delegatedPlumbBar ? null : scrollHintIntro,
        roleIntro,
        leadIntro,
        handIntro,
        ctaIntro,
        scrimIntro,
      ].filter(Boolean);

      const tl = gsap.timeline({
        paused: waitForButterflyVideo,
        defaults: { ease: "power3.out" },
        onComplete: () => {
          introPlayedRef.current = true;
          gsap.set(clearTargets, { clearProps: "transform,opacity" });
          setIntroSettled(true);
        },
      });
      introTlRef.current = tl;

      if (matBorderRef.current) {
        gsap.set(matBorderRef.current, { opacity: 0 });
        tl.fromTo(
          matBorderRef.current,
          { opacity: 0.65, inset: "10px" },
          {
            opacity: 0,
            inset: "0px",
            duration: 1.05,
            ease: "power2.out",
            immediateRender: false,
          },
          0,
        );
      }

      if (scrimIntro) {
        gsap.set(scrimIntro, { opacity: 0 });
        tl.to(scrimIntro, { opacity: 1, duration: 0.88, ease: "power2.out" }, 0.14);
      }

      // Top display marks fade in while sliding down from top
      gsap.set([jorgeIntro, bucioIntro], { y: -28, opacity: 0 });
      tl.to(jorgeIntro, { y: 0, opacity: 1, duration: 1.02 }, 0.06);
      tl.to(bucioIntro, { y: 0, opacity: 1, duration: 1.02 }, 0.18);

      // Standalone scroll hint when not delegated to top-level ScrollPlumbBar
      if (!delegatedPlumbBar && scrollHintIntro) {
        gsap.set(scrollHintIntro, { y: 24, opacity: 0 });
        tl.to(scrollHintIntro, { y: 0, opacity: 1, duration: 0.94 }, 0.34);
      }

      // Bottom positioning copy & CTAs fade in while sliding up from bottom
      gsap.set([roleIntro, leadIntro, handIntro, ctaIntro].filter(Boolean), {
        y: 26,
        opacity: 0,
      });
      tl.to(roleIntro, { y: 0, opacity: 1, duration: 0.96 }, 0.3);
      tl.to(leadIntro, { y: 0, opacity: 1, duration: 0.96 }, 0.42);
      if (handIntro) {
        tl.to(handIntro, { y: 0, opacity: 1, duration: 0.94 }, 0.54);
      }
      tl.to(ctaIntro, { y: 0, opacity: 1, duration: 0.94 }, 0.66);

      // Horizontal line under Full-Stack draws itself left-to-right LAST (1.64s -> 2.36s)
      if (roleRule) {
        gsap.set(roleRule, { drawSVG: "0% 0%", opacity: 0 });
        tl.to(roleRule, { opacity: 1, duration: 0.12, ease: "none" }, 1.64);
        tl.to(
          roleRule,
          {
            drawSVG: "0% 100%",
            duration: 0.72,
            ease: "power2.inOut",
          },
          1.64,
        );
      }
    }, scopeEl);

    return () => {
      introTlRef.current = null;
      ctx.revert();
    };
  }, [delegatedPlumbBar, desktopPinned, reducedMotion, showIntroVideo, snapHeroIntroToEnd]);

  // Unified desktop 4-Act spatial stage: Act 00 (Hero) -> Act 01 (Journey) -> Act 02 (Craft 3D flip & white card) -> Act 03 (Stack full-window olive growth & row-by-row left-to-right render)
  useLayoutEffect(() => {
    if (!desktopPinned) {
      progressRef.current = 0;
      pinnedProgressRef.current = 0;
      if (wasPinnedRef.current) {
        wasPinnedRef.current = false;
        ensureGsapPlugins();
        ScrollTrigger.refresh();
      }
      return;
    }

    wasPinnedRef.current = true;
    ensureGsapPlugins();

    const stage = stageRef.current;
    const plate = plateFrameRef.current;
    const frontFace = frontFaceRef.current;
    const frontWhiteWash = frontWhiteWashRef.current;
    const backCardBorder = backCardBorderRef.current;
    const backOliveLayer = backOliveLayerRef.current;
    const shaderWrap = shaderWrapRef.current;
    const heroScrim = heroScrimRef.current;
    const heroOverlay = heroOverlayRef.current;
    const jorgeMark = jorgeMarkRef.current;
    const bucioMark = bucioMarkRef.current;
    const heroScrollHint = heroScrollHintRef.current;
    const heroCopy = heroCopyRef.current;
    const heroCta = heroCtaRef.current;
    const espressoWipe = espressoWipeRef.current;
    const limewashGround = limewashGroundRef.current;
    const journeySection = journeySectionRef.current;
    const journeyLeft = journeyLeftRef.current;
    const journeyRight = journeyRightRef.current;
    const craftWrap = craftStageWrapRef.current;
    const stackWrap = stackStageWrapRef.current;

    if (
      !stage ||
      !plate ||
      !frontFace ||
      !frontWhiteWash ||
      !backCardBorder ||
      !backOliveLayer ||
      !shaderWrap ||
      !heroScrim ||
      !heroOverlay ||
      !jorgeMark ||
      !bucioMark ||
      !heroCopy ||
      !heroCta ||
      !espressoWipe ||
      !limewashGround ||
      !journeySection ||
      !journeyLeft ||
      !journeyRight ||
      !craftWrap ||
      !stackWrap
    ) {
      return;
    }

    const craftLeftCol = craftWrap.querySelector<HTMLElement>('[data-slot="craft-left-col"]');
    const craftHeading = craftWrap.querySelector<HTMLElement>('[data-slot="craft-heading"]');
    const craftPlateEl = craftWrap.querySelector<HTMLElement>('[data-slot="craft-specimen-plate"]');
    const craftCardInner = craftWrap.querySelector<HTMLElement>('[data-slot="craft-card-inner"]');
    const stackSeqNodes = Array.from(
      stackWrap.querySelectorAll<HTMLElement>("[data-stack-seq]"),
    ).sort((a, b) => Number(a.dataset.stackSeq ?? 0) - Number(b.dataset.stackSeq ?? 0));

    if (!craftLeftCol || !craftPlateEl || !craftCardInner) {
      return;
    }

    const getJourneyRect = () => {
      const w = window.innerWidth >= 1180 ? 290 : Math.max(220, Math.round(window.innerWidth * 0.23));
      const h = window.innerWidth >= 1180 ? 415 : Math.max(315, Math.round(w * 1.43));
      const slotEl = journeyCenterSlotRef.current;
      if (slotEl) {
        const stageRect = stage.getBoundingClientRect();
        const slotRect = slotEl.getBoundingClientRect();
        if (slotRect.width > 0 && slotRect.height > 0) {
          return {
            x: Math.round(slotRect.left - stageRect.left + (slotRect.width - w) * 0.5),
            y: Math.round(slotRect.top - stageRect.top + (slotRect.height - h) * 0.5),
            width: w,
            height: h,
          };
        }
      }
      return {
        x: Math.round((window.innerWidth - w) * 0.5),
        y: Math.round((window.innerHeight - h + 68) * 0.5),
        width: w,
        height: h,
      };
    };

    const getCraftCardRect = () => {
      const stageRect = stage.getBoundingClientRect();
      const cardRect = craftPlateEl.getBoundingClientRect();
      if (cardRect.width > 0 && cardRect.height > 0) {
        return {
          x: cardRect.left - stageRect.left,
          y: cardRect.top - stageRect.top,
          width: cardRect.width,
          height: cardRect.height,
        };
      }
      const fallbackW = Math.round(window.innerWidth * 0.52);
      const fallbackH = Math.min(500, Math.round(window.innerHeight * 0.62));
      return {
        x: Math.round(window.innerWidth * 0.43),
        y: Math.round((window.innerHeight - fallbackH + 68) * 0.5),
        width: fallbackW,
        height: fallbackH,
      };
    };

    const ctx = gsap.context(() => {
      gsap.set(heroOverlay, { opacity: 1, pointerEvents: "auto" });
      gsap.set([heroCopy, heroCta], { visibility: "visible" });
      if (heroScrollHint && !delegatedPlumbBar) {
        gsap.set(heroScrollHint, { visibility: "visible" });
      }
      gsap.set(espressoWipe, { yPercent: 104 });
      gsap.set(limewashGround, { opacity: 0 });
      gsap.set(frontWhiteWash, { opacity: 0 });
      gsap.set(backOliveLayer, { opacity: 0 });
      gsap.set(backCardBorder, { opacity: 1 });
      gsap.set(journeySection, { autoAlpha: 0, pointerEvents: "none" });
      gsap.set([journeyLeft, journeyRight], { y: 28, opacity: 0 });
      gsap.set(craftWrap, { autoAlpha: 0, pointerEvents: "none" });
      gsap.set(craftLeftCol, { y: 26, opacity: 0 });
      gsap.set(craftCardInner, { y: 14, opacity: 0 });
      gsap.set(stackWrap, { autoAlpha: 0, pointerEvents: "none" });
      if (stackSeqNodes.length > 0) {
        gsap.set(stackSeqNodes, { opacity: 0, x: -16, y: 10 });
      }

      const journeyHeadingTargets = [
        journeyHeadingLeftRef.current,
        journeyHeadingRightRef.current,
      ].filter((el): el is NonNullable<typeof el> => el !== null);
      const splitJourney =
        journeyHeadingTargets.length > 0
          ? SplitText.create(journeyHeadingTargets, {
              type: "lines",
              mask: "lines",
              linesClass: "split-line",
              aria: "none",
            })
          : null;
      if (splitJourney?.lines.length) {
        gsap.set(splitJourney.lines, { yPercent: 118 });
      }

      const splitCraft = craftHeading
        ? SplitText.create(craftHeading, {
            type: "lines",
            mask: "lines",
            linesClass: "split-line",
            aria: "none",
          })
        : null;
      if (splitCraft?.lines.length) {
        gsap.set(splitCraft.lines, { yPercent: 116 });
      }

      const syncStageSideEffects = (progress: number) => {
        pinnedProgressRef.current = progress;
        // Map normalized [0..0.13] convergence to [0..1] for MonarchReliefCanvas shader
        progressRef.current = Math.min(1, progress / 0.13);
        if (delegatedPlumbBar) {
          syncScrollHintInteractivity(progress > 0.012);
        }
        syncDualVideosForScroll(progress > 0.008 && progress < 0.355, progress >= 0.355);
        onActiveActChange?.(resolvePinnedStageAct(progress));
      };

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          id: "hero-journey-pin",
          refreshPriority: 1,
          trigger: stage,
          start: "top top",
          end: "+=540%",
          pin: true,
          scrub: 0.64,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (window.scrollY > 12) {
              snapHeroIntroToEnd();
            }
            syncStageSideEffects(self.progress);
          },
          onEnterBack: (self) => {
            syncStageSideEffects(self.progress);
          },
          onLeave: () => {
            onActiveActChange?.("04-portfolio");
          },
        },
      });

      tl.addLabel("hero", 0);

      // =========================================================================
      // BEAT 1 (0.00 -> 0.20): Page 1 (Hero) -> Page 2 (My Journey)
      // =========================================================================
      tl.to(jorgeMark, { y: -38, opacity: 0, duration: 0.06 }, 0);
      tl.to(bucioMark, { y: -32, opacity: 0, duration: 0.06 }, 0.004);
      if (heroScrollHint && !delegatedPlumbBar) {
        tl.to(heroScrollHint, { y: 20, opacity: 0, duration: 0.05 }, 0);
        tl.set(heroScrollHint, { visibility: "hidden", pointerEvents: "none" }, 0.068);
      }
      tl.to([heroCopy, heroCta], { y: 26, opacity: 0, duration: 0.058 }, 0.004);
      tl.to([heroScrim, shaderWrap], { opacity: 0, duration: 0.065 }, 0);
      // Keep heroOverlay visibility: visible (at opacity: 0) so the sole document <h1> stays in the heading outline (WCAG / axe page-has-heading-one), while hiding off-phase Hero copy & interactive links
      tl.set(heroOverlay, { opacity: 0, pointerEvents: "none" }, 0.068);
      tl.set([heroCopy, heroCta], { visibility: "hidden" }, 0.068);

      tl.to(
        espressoWipe,
        {
          yPercent: 0,
          duration: 0.11,
          ease: "power2.inOut",
        },
        0.02,
      );

      tl.fromTo(
        plate,
        {
          x: 0,
          y: 0,
          width: () => window.innerWidth,
          height: () => window.innerHeight,
          rotateY: 0,
          boxShadow: "0 0 0 rgba(0, 0, 0, 0)",
        },
        {
          x: () => getJourneyRect().x,
          y: () => getJourneyRect().y,
          width: () => getJourneyRect().width,
          height: () => getJourneyRect().height,
          rotateY: 0,
          boxShadow: "0 28px 64px -18px rgba(8, 5, 4, 0.65), 0 1px 0 rgba(255,255,255,0.6) inset",
          duration: 0.11,
          ease: "power2.inOut",
          immediateRender: true,
        },
        0.02,
      );

      tl.fromTo(
        frontFace,
        {
          padding: 0,
          backgroundColor: "rgba(247, 241, 230, 0)",
        },
        {
          padding: 10,
          backgroundColor: "rgba(247, 241, 230, 1)",
          duration: 0.11,
          ease: "power2.inOut",
          immediateRender: true,
        },
        0.02,
      );

      tl.set(journeySection, { autoAlpha: 1, pointerEvents: "auto" }, 0.132);
      tl.to(
        journeyLeft,
        {
          y: 0,
          opacity: 1,
          duration: 0.065,
          ease: "power2.out",
        },
        0.132,
      );
      if (splitJourney?.lines.length) {
        tl.to(
          splitJourney.lines,
          {
            yPercent: 0,
            duration: 0.058,
            stagger: { amount: 0.02 },
            ease: "power3.out",
          },
          0.136,
        );
      }
      tl.to(
        journeyRight,
        {
          y: 0,
          opacity: 1,
          duration: 0.065,
          ease: "power2.out",
        },
        0.142,
      );

      // Hold Page 2 (0.207 -> 0.27)

      // =========================================================================
      // BEAT 2 (0.27 -> 0.49): Page 2 -> Page 3 (Text fades out, butterfly flips right-to-left, turns card-white & grows to Page 3 card size, card & left text animate in)
      // =========================================================================
      tl.to(
        [journeyLeft, journeyRight],
        {
          y: -18,
          opacity: 0,
          duration: 0.048,
          ease: "power2.in",
        },
        0.27,
      );
      tl.set(journeySection, { autoAlpha: 0, pointerEvents: "none" }, 0.32);

      tl.to(
        limewashGround,
        {
          opacity: 1,
          duration: 0.13,
          ease: "power2.inOut",
        },
        0.29,
      );

      // Warm cotton-rag white wash over butterfly print during first half of flip (0deg -> -90deg)
      tl.to(
        frontWhiteWash,
        {
          opacity: 0.9,
          duration: 0.065,
          ease: "power1.in",
        },
        0.29,
      );

      tl.fromTo(
        plate,
        {
          x: () => getJourneyRect().x,
          y: () => getJourneyRect().y,
          width: () => getJourneyRect().width,
          height: () => getJourneyRect().height,
          rotateY: 0,
          boxShadow: "0 28px 64px -18px rgba(8, 5, 4, 0.65), 0 1px 0 rgba(255,255,255,0.6) inset",
        },
        {
          x: () => getCraftCardRect().x,
          y: () => getCraftCardRect().y,
          width: () => getCraftCardRect().width,
          height: () => getCraftCardRect().height,
          rotateY: -180,
          boxShadow:
            "0 1px 0 rgba(255, 255, 255, 0.82) inset, 0 22px 48px -20px rgba(33, 24, 19, 0.24), 0 2px 6px rgba(33, 24, 19, 0.08)",
          duration: 0.13,
          ease: "power2.inOut",
          immediateRender: false,
        },
        0.29,
      );

      // Once card lands in Page 3's right slot (0.42), reveal card text & animate left column in Page 2 fashion
      tl.set(craftWrap, { autoAlpha: 1, pointerEvents: "auto" }, 0.42);
      tl.to(
        craftCardInner,
        {
          y: 0,
          opacity: 1,
          duration: 0.06,
          ease: "power2.out",
        },
        0.422,
      );
      tl.to(
        craftLeftCol,
        {
          y: 0,
          opacity: 1,
          duration: 0.066,
          ease: "power2.out",
        },
        0.43,
      );
      if (splitCraft?.lines.length) {
        tl.to(
          splitCraft.lines,
          {
            yPercent: 0,
            duration: 0.058,
            stagger: { amount: 0.018 },
            ease: "power3.out",
          },
          0.434,
        );
      }

      // Hold Page 3 (0.496 -> 0.58)

      // =========================================================================
      // BEAT 3 (0.58 -> 0.91): Page 3 -> Page 4 (Right card grows to fit full window, turns Page 4 olive color, then components render left-to-right line-by-line top-to-bottom)
      // =========================================================================
      tl.to(
        [craftCardInner, craftLeftCol],
        {
          y: -16,
          opacity: 0,
          duration: 0.046,
          ease: "power2.in",
        },
        0.58,
      );
      tl.set(craftWrap, { autoAlpha: 0, pointerEvents: "none" }, 0.628);

      tl.fromTo(
        plate,
        {
          x: () => getCraftCardRect().x,
          y: () => getCraftCardRect().y,
          width: () => getCraftCardRect().width,
          height: () => getCraftCardRect().height,
          rotateY: -180,
          boxShadow:
            "0 1px 0 rgba(255, 255, 255, 0.82) inset, 0 22px 48px -20px rgba(33, 24, 19, 0.24), 0 2px 6px rgba(33, 24, 19, 0.08)",
        },
        {
          x: 0,
          y: 0,
          width: () => window.innerWidth,
          height: () => window.innerHeight,
          rotateY: -180,
          boxShadow: "0 0 0 rgba(0, 0, 0, 0)",
          duration: 0.12,
          ease: "power2.inOut",
          immediateRender: false,
        },
        0.63,
      );

      tl.to(
        backOliveLayer,
        {
          opacity: 1,
          duration: 0.112,
          ease: "power2.inOut",
        },
        0.632,
      );
      tl.to(
        backCardBorder,
        {
          opacity: 0,
          duration: 0.09,
          ease: "power1.out",
        },
        0.65,
      );

      // Once card fills window in Page 4 olive (0.752), render text/components left-to-right, top-to-bottom line-by-line
      tl.set(stackWrap, { autoAlpha: 1, pointerEvents: "auto" }, 0.752);
      if (stackSeqNodes.length > 0) {
        tl.to(
          stackSeqNodes,
          {
            opacity: 1,
            x: 0,
            y: 0,
            duration: 0.032,
            stagger: 0.0052,
            ease: "power2.out",
          },
          0.754,
        );
      }

      // Hold Page 4 (0.91 -> 1.00) so total timeline duration is normalized to 1.00
      tl.to({}, { duration: 0.09 }, 0.91);
    }, stage);

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

    return () => {
      disposed = true;
      ctx.revert();
    };
  }, [
    delegatedPlumbBar,
    desktopPinned,
    onActiveActChange,
    snapHeroIntroToEnd,
    syncDualVideosForScroll,
    syncScrollHintInteractivity,
  ]);

  const renderDualHeroVideos = () => {
    if (!anyHeroVideoActive) return null;

    return (
      <>
        {showLoopVideo ? (
          <video
            ref={loopVideoRef}
            data-slot="hero-transition-video"
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
            poster="/media/hero-monarch.webp"
            onEnded={handleLoopVideoEnded}
            onPause={handleLoopVideoPause}
            onError={handleLoopVideoError}
            style={{ opacity: showIntroVideo ? 0 : 1 }}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[52%_42%] transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          >
            <source src="/media/hero-monarch-loop.webm" type="video/webm" />
            <source
              src="/media/hero-monarch-loop.mp4"
              type="video/mp4"
              onError={handleLoopVideoError}
            />
          </video>
        ) : null}

        {showIntroVideo ? (
          <video
            ref={introVideoRef}
            data-slot="hero-intro-video"
            autoPlay
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
            poster="/media/hero-monarch-intro-poster.webp"
            onEnded={handleIntroVideoEnded}
            onError={handleIntroVideoError}
            style={{ opacity: 1 }}
            className="pointer-events-none absolute inset-0 h-full w-full bg-[#ddd2c0] object-cover object-[52%_42%] transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          >
            <source src="/media/hero-monarch-intro.webm" type="video/webm" />
            <source
              src="/media/hero-monarch-intro.mp4"
              type="video/mp4"
              onError={handleIntroVideoError}
            />
          </video>
        ) : null}
      </>
    );
  };

  if (!desktopPinned) {
    return (
      <div
        ref={stackedRootRef}
        data-slot="hero-journey-stacked"
        className="w-full overflow-x-clip"
      >
        {/* Stacked Act 00 (Mobile < 900px, short viewports, & Reduced Motion) */}
        <section
          id="hero"
          data-act="00-hero"
          aria-label="Opening Folio"
          onFocusCapture={startHeroTextReveal}
          className="material-travertine relative z-0 flex min-h-svh flex-col justify-between px-5 pt-[74px] pb-6 sm:px-8 sm:pt-[82px] sm:pb-12"
        >
          {/* Deepens as the espresso Journey sheet slides over the hero */}
          <div
            aria-hidden="true"
            data-mobile-dim
            className="pointer-events-none absolute inset-0 z-10 bg-[#140e0b] opacity-0"
          />
          <div data-mobile-recede className="mx-auto w-full max-w-[760px]">
            <h1 className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-[var(--ink-espresso)]">
              <span
                data-slot="hero-first-name"
                className="hero-display-mark block text-[clamp(4rem,19.5vw,7.5rem)]"
              >
                <span ref={jorgeIntroRef} className="inline-block">
                  {HERO_CONTENT.firstName}
                </span>
              </span>
              <span className="sr-only"> </span>
              <span
                data-slot="hero-last-name"
                className="hero-display-mark ml-auto block text-[clamp(4rem,19.5vw,7.5rem)]"
              >
                <span ref={bucioIntroRef} className="inline-block">
                  {HERO_CONTENT.lastName}
                </span>
              </span>
            </h1>

            <div
              data-slot="monarch-plate-frame"
              onPointerEnter={handleJourneyButterflyHover}
              className="surface-cotton-rag relative my-2.5 aspect-[16/10] w-full overflow-hidden sm:my-5 sm:aspect-[16/11]"
            >
              {/* Absolute inset, not padding + h-full: WebKit resolves h-full against the
                  aspect-ratio box's full height and pushes the image over the bottom mat */}
              <div className="absolute inset-2 overflow-hidden">
                <picture>
                  <source srcSet="/media/hero-monarch.avif" type="image/avif" />
                  <source srcSet="/media/hero-monarch.webp" type="image/webp" />
                  <img
                    ref={heroImgRef}
                    src="/media/hero-monarch.jpg"
                    alt={MONARCH_IMAGE_ALT}
                    width={1376}
                    height={768}
                    fetchPriority="high"
                    decoding="sync"
                    className="h-full w-full object-cover object-[52%_42%]"
                  />
                </picture>
                {renderDualHeroVideos()}
                {reducedMotion ? (
                  <Suspense fallback={null}>
                    <MonarchReliefCanvas
                      progressRef={progressRef}
                      sourceImgRef={heroImgRef}
                      videoActive={anyHeroVideoActive}
                    />
                  </Suspense>
                ) : null}
              </div>
            </div>

            <div ref={scrollHintIntroRef} className="my-1.5 sm:my-3.5">
              <a
                ref={scrollHintLinkRef}
                href="#journey"
                data-slot="hero-scroll-hint"
                aria-label="Scroll down to My Journey"
                onPointerEnter={() => onScrollHintHoverChange?.(true)}
                onPointerLeave={() => onScrollHintHoverChange?.(false)}
                onFocus={() => onScrollHintHoverChange?.(true)}
                onBlur={() => onScrollHintHoverChange?.(false)}
                onClick={(event) => {
                  event.preventDefault();
                  navigateToAnchor("#journey");
                }}
                className={`inline-flex h-[56px] w-[42px] items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:h-[84px] sm:w-[48px] ${
                  delegatedPlumbBar
                    ? "border border-transparent bg-transparent"
                    : "border border-[#211813]/22 bg-[#f7f1e6]/88 shadow-[0_12px_28px_-14px_rgba(33,24,19,0.28)] hover:border-[#211813]/42 hover:bg-[#f7f1e6]/96"
                }`}
              >
                {delegatedPlumbBar ? null : <PlumbTrackSvg reducedMotion={reducedMotion} />}
              </a>
            </div>

            <div className="mt-1.5 space-y-2 sm:mt-3 sm:space-y-3">
              <p
                ref={roleIntroRef}
                data-slot="hero-role-line"
                className="font-editorial-serif text-[clamp(1.375rem,5.2vw,1.9rem)] leading-[1.18] text-[var(--ink-espresso)] sm:leading-[1.2]"
              >
                {renderRoleLine(HERO_CONTENT.roleLine, "text-[var(--accent-monarch)]")}
              </p>

              <svg
                aria-hidden="true"
                viewBox="0 0 260 6"
                fill="none"
                className="mt-1.5 h-1.5 w-48 overflow-visible sm:mt-2"
              >
                <path
                  ref={roleRulePathRef}
                  data-slot="hero-role-rule"
                  d="M0 3H258"
                  stroke="rgba(166, 64, 40, 0.62)"
                  strokeWidth="1.35"
                  strokeLinecap="round"
                />
              </svg>

              <p
                ref={leadIntroRef}
                className="font-editorial-serif text-[17px] leading-[1.48] text-[var(--ink-body-dark)] sm:text-[18px] sm:leading-[1.58]"
              >
                {HERO_CONTENT.lead}
              </p>
              <p
                ref={handIntroRef}
                data-slot="hero-hand-note"
                aria-hidden="true"
                className="overflow-visible pr-3 font-studio-hand text-[20px] text-[var(--ink-muted-dark)] sm:text-[22px]"
              >
                {HERO_CONTENT.handNote}
              </p>
            </div>

            <div ref={ctaIntroRef} className="mt-3.5 flex flex-wrap items-center gap-3 sm:mt-6">
              <a
                href={PORTFOLIO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="editorial-btn-sheen group inline-flex min-h-11 items-center gap-2 bg-[var(--ink-espresso)] px-5 py-3 font-utility text-[15px] font-medium text-[var(--surface-rag)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5"
              >
                <span>{HERO_CONTENT.primaryCtaLabel}</span>
                <span
                  aria-hidden="true"
                  className="inline-block transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                >
                  ↗
                </span>
              </a>
              <a
                href="#connect"
                onClick={(event) => {
                  event.preventDefault();
                  navigateToAnchor("#connect");
                }}
                className="editorial-btn-sheen inline-flex min-h-11 items-center border border-[#211813]/35 bg-[var(--surface-rag)] px-5 py-3 font-utility text-[15px] font-medium text-[var(--ink-espresso)] transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white"
              >
                {HERO_CONTENT.secondaryCtaLabel}
              </a>
            </div>
          </div>
        </section>

        {/* Running-stitch seam + Stacked Act 01 */}
        <section
          id="journey"
          data-act="01-journey"
          aria-labelledby="journey-heading-stacked"
          className="material-espresso relative z-10 px-5 pt-12 pb-20 shadow-[0_-24px_48px_-18px_rgba(8,5,4,0.55)] sm:px-8"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 1440 42"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-x-0 -top-6 h-7 w-full"
          >
            <path d="M0,28 Q720,2 1440,28 L1440,42 L0,42 Z" fill="#251b16" />
            <path
              data-mobile-stitch
              d="M0,33 Q720,7 1440,33"
              fill="none"
              stroke="rgba(235, 221, 200, 0.42)"
              strokeWidth="1.35"
              strokeDasharray="7 6"
            />
          </svg>

          <div className="mx-auto max-w-[760px] space-y-6">
            <p
              data-mobile-rise
              className="font-utility text-[14px] uppercase tracking-[0.14em] text-[var(--accent-monarch-light)]"
            >
              {JOURNEY_CONTENT.eyebrow}
            </p>

            <h2
              id="journey-heading-stacked"
              className="chapter-display-heading text-[clamp(3.15rem,13vw,5rem)] text-[var(--ink-cream)]"
            >
              <span className="block">{JOURNEY_CONTENT.headlinePlain}</span>
              <span className="mt-1 block">
                {renderJourneyAccent(JOURNEY_CONTENT.headlineAccent, false)}
              </span>
            </h2>

            <div className="space-y-5 font-editorial-serif text-[18px] leading-[1.64] text-[var(--ink-cream-soft)]">
              <p data-mobile-rise>{JOURNEY_CONTENT.paragraphs[0]}</p>
              <p data-mobile-rise>{JOURNEY_CONTENT.paragraphs[1]}</p>
            </div>

            <dl className="grid grid-cols-1 gap-4 border-t border-[#f4eee3]/14 pt-6 sm:grid-cols-2">
              {JOURNEY_CONTENT.milestones.map((item) => (
                <div key={item.period} data-mobile-rise>
                  <dt className="font-utility text-[14px] font-semibold tracking-[0.08em] text-[var(--accent-monarch-light)]">
                    {item.period}
                  </dt>
                  <dd className="mt-1 font-editorial-serif text-[17px] text-[var(--ink-cream)]">
                    {item.label}
                  </dd>
                </div>
              ))}
            </dl>

            <p
              aria-hidden="true"
              data-mobile-rise
              className="pt-2 font-studio-hand text-[23px] text-[var(--ink-cream-soft)]"
            >
              {JOURNEY_CONTENT.handNote}
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div data-slot="hero-journey-root">
      <div
        ref={stageRef}
        data-slot="hero-journey-stage"
        className="material-travertine relative h-svh w-full overflow-hidden"
      >
        {/* Page 2 dark espresso ground rising over Page 1 */}
        <div
          ref={espressoWipeRef}
          aria-hidden="true"
          className="material-espresso pointer-events-none absolute inset-0 z-10 will-change-transform"
        >
          <svg
            viewBox="0 0 1440 56"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-x-0 -top-11 h-12 w-full"
          >
            <path d="M0,44 Q720,4 1440,44 L1440,56 L0,56 Z" fill="#251b16" />
            <path
              d="M0,49 Q720,9 1440,49"
              fill="none"
              stroke="rgba(235, 221, 200, 0.48)"
              strokeWidth="1.4"
              strokeDasharray="7 6"
            />
          </svg>
        </div>

        {/* Page 3 warm limewash ground emerging as butterfly card flips right-to-left */}
        <div
          ref={limewashGroundRef}
          aria-hidden="true"
          className="material-limewash pointer-events-none absolute inset-0 z-[15] opacity-0 will-change-[opacity]"
        />

        {/* Single shared 3D Morphing Plate across Pages 1 -> 2 -> 3 -> 4 */}
        <div
          style={{ perspective: "1600px" }}
          className="pointer-events-none absolute inset-0 z-20"
        >
          <div
            ref={plateFrameRef}
            data-slot="monarch-plate-frame"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100vw",
              height: "100svh",
              transformStyle: "preserve-3d",
            }}
            className="will-change-[transform,width,height]"
          >
            {/* Front 3D Face: Monarch Butterfly Plate (Pages 1 & 2, flips away right-to-left into Page 3) */}
            <div
              ref={frontFaceRef}
              data-slot="monarch-plate-front"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
              }}
              className="absolute inset-0 overflow-hidden"
            >
              <div className="relative h-full w-full overflow-hidden">
                <picture>
                  <source srcSet="/media/hero-monarch.avif" type="image/avif" />
                  <source srcSet="/media/hero-monarch.webp" type="image/webp" />
                  <img
                    ref={heroImgRef}
                    src="/media/hero-monarch.jpg"
                    alt={MONARCH_IMAGE_ALT}
                    width={1376}
                    height={768}
                    fetchPriority="high"
                    decoding="sync"
                    className="h-full w-full object-cover object-[52%_42%]"
                  />
                </picture>

                {renderDualHeroVideos()}

                <div ref={shaderWrapRef} className="absolute inset-0">
                  {introSettled || reducedMotion ? (
                    <Suspense fallback={null}>
                      <MonarchReliefCanvas
                        progressRef={progressRef}
                        sourceImgRef={heroImgRef}
                        videoActive={anyHeroVideoActive}
                      />
                    </Suspense>
                  ) : null}
                </div>

                {/* Bottom legibility scrim for Act 00 positioning copy & CTAs */}
                <div
                  ref={heroScrimRef}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                >
                  <div
                    ref={heroScrimIntroRef}
                    className="h-full w-full"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(247,241,230,0.16) 0%, rgba(33,24,19,0.0) 36%, rgba(28,20,15,0.44) 68%, rgba(24,17,13,0.84) 100%)",
                    }}
                  />
                </div>

                {/* Cotton-rag white wash bleaching print as horizontal 3D flip initiates */}
                <div
                  ref={frontWhiteWashRef}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[#f7f1e6] opacity-0"
                />
              </div>
            </div>

            {/* Back 3D Face: Cotton-Rag Card White on Page 3 -> Botanical Olive Full Window on Page 4 */}
            <div
              ref={backFaceRef}
              data-slot="monarch-plate-back"
              aria-hidden="true"
              style={{
                transform: "rotateY(180deg)",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
              }}
              className="surface-cotton-rag absolute inset-0 overflow-hidden"
            >
              <div
                ref={backOliveLayerRef}
                className="material-olive pointer-events-none absolute inset-0 opacity-0"
              />
              <div
                ref={backCardBorderRef}
                className="pointer-events-none absolute inset-0 border border-[#211813]/14"
              />
            </div>
          </div>
        </div>

        {/* Skippable arrival gallery mat frame */}
        <div
          ref={matBorderRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-25 border-[12px] border-[var(--surface-rag)] opacity-0"
        />

        {/* Page 1 / Act 00: Opening Hero (Sole section containing JORGE / BUCIO) */}
        <section
          ref={heroOverlayRef}
          id="hero"
          data-act="00-hero"
          aria-label="Opening Folio"
          onFocusCapture={startHeroTextReveal}
          className="relative z-30 mx-auto flex h-full w-full max-w-[1440px] flex-col justify-between px-8 pt-[102px] pb-10 lg:px-12"
        >
          <div className="relative flex-1">
            <h1 className="m-0 font-normal text-[var(--ink-espresso)]">
              <span
                ref={jorgeMarkRef}
                data-slot="hero-first-name"
                style={{ textShadow: "0 1px 18px rgba(247, 241, 230, 0.45)" }}
                className="hero-display-mark inline-block select-none text-[clamp(6.4rem,14.8vw,13.8rem)] tracking-[0.01em]"
              >
                <span ref={jorgeIntroRef} className="inline-block">
                  {HERO_CONTENT.firstName}
                </span>
              </span>
              <span className="sr-only"> </span>
              <span
                ref={bucioMarkRef}
                data-slot="hero-last-name"
                style={{
                  textShadow:
                    "0 1px 22px rgba(247, 241, 230, 0.72), 0 0 8px rgba(247, 241, 230, 0.42)",
                }}
                className="hero-display-mark absolute right-0 top-[28%] inline-block select-none text-[clamp(6.4rem,14.8vw,13.8rem)] tracking-[0.01em]"
              >
                <span ref={bucioIntroRef} className="inline-block">
                  {HERO_CONTENT.lastName}
                </span>
              </span>
            </h1>

            {/* Studio plumb-bar scroll hint placed cleanly between "JORGE" and "Full-Stack" */}
            <div
              ref={heroScrollHintRef}
              className="absolute left-0 top-[58%] -translate-y-1/2"
            >
              <div ref={scrollHintIntroRef}>
                <a
                  ref={scrollHintLinkRef}
                  href="#journey"
                  data-slot="hero-scroll-hint"
                  aria-label="Scroll down to My Journey"
                  onPointerEnter={() => onScrollHintHoverChange?.(true)}
                  onPointerLeave={() => onScrollHintHoverChange?.(false)}
                  onFocus={() => onScrollHintHoverChange?.(true)}
                  onBlur={() => onScrollHintHoverChange?.(false)}
                  onClick={(event) => {
                    event.preventDefault();
                    navigateToAnchor("#journey");
                  }}
                  className={`inline-flex h-[96px] w-[54px] items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    delegatedPlumbBar
                      ? "border border-transparent bg-transparent"
                      : "border border-[#211813]/22 bg-[#f7f1e6]/88 shadow-[0_14px_32px_-14px_rgba(33,24,19,0.3)] backdrop-blur-[4px] hover:border-[#211813]/42 hover:bg-[#f7f1e6]/96"
                  }`}
                >
                  {delegatedPlumbBar ? null : <PlumbTrackSvg reducedMotion={reducedMotion} />}
                </a>
              </div>
            </div>
          </div>

          <div className="flex items-end justify-between gap-8">
            <div ref={heroCopyRef} className="max-w-[540px] text-[var(--ink-cream)]">
              <p
                ref={roleIntroRef}
                data-slot="hero-role-line"
                className="font-editorial-serif text-[clamp(1.65rem,2.45vw,2.35rem)] leading-[1.12] tracking-[-0.01em] text-[var(--ink-cream)]"
              >
                {renderRoleLine(HERO_CONTENT.roleLine, "text-[var(--accent-monarch-light)]")}
              </p>

              <svg
                aria-hidden="true"
                viewBox="0 0 260 6"
                fill="none"
                className="mt-2.5 h-1.5 w-52 overflow-visible"
              >
                <path
                  ref={roleRulePathRef}
                  data-slot="hero-role-rule"
                  d="M0 3H258"
                  stroke="rgba(228, 154, 126, 0.78)"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>

              <p
                ref={leadIntroRef}
                className="mt-2.5 max-w-[490px] font-editorial-serif text-[18px] leading-[1.55] text-[#efe7da]"
              >
                {HERO_CONTENT.lead}
              </p>
              <p
                ref={handIntroRef}
                data-slot="hero-hand-note"
                aria-hidden="true"
                className="mt-2 overflow-visible pr-3 font-studio-hand text-[24px] text-[#e6dac8]/90"
              >
                {HERO_CONTENT.handNote}
              </p>
            </div>

            <div ref={heroCtaRef} className="shrink-0 pb-1">
              <div ref={ctaIntroRef} className="flex items-center gap-3.5">
                <MagneticAction>
                  <a
                    href={PORTFOLIO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="surface-cotton-rag editorial-btn-sheen group relative inline-flex min-h-12 items-center gap-2.5 px-6 py-3 font-utility text-[15px] font-medium tracking-[0.03em] text-[var(--ink-espresso)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-16px_rgba(12,8,5,0.48)]"
                  >
                    <span>{HERO_CONTENT.primaryCtaLabel}</span>
                    <span
                      aria-hidden="true"
                      className="inline-block transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    >
                      ↗
                    </span>
                  </a>
                </MagneticAction>

                <MagneticAction strength={2.5}>
                  <a
                    href="#connect"
                    onClick={(event) => {
                      event.preventDefault();
                      navigateToAnchor("#connect");
                    }}
                    className="editorial-btn-sheen relative inline-flex min-h-12 items-center border border-[#f4eee3]/45 bg-[#211813]/52 px-6 py-3 font-utility text-[15px] font-medium tracking-[0.03em] text-[var(--ink-cream)] backdrop-blur-sm transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-[#f4eee3]/75 hover:bg-[#211813]/82"
                  >
                    <span>{HERO_CONTENT.secondaryCtaLabel}</span>
                  </a>
                </MagneticAction>
              </div>
            </div>
          </div>
        </section>

        {/* Page 2 / Act 01: My Journey */}
        <section
          ref={journeySectionRef}
          id="journey"
          data-act="01-journey"
          aria-labelledby="journey-heading-desktop"
          className="invisible pointer-events-none absolute inset-0 z-30 mx-auto flex h-full w-full max-w-[1440px] items-center px-8 pt-[68px] lg:px-12"
        >
          <div className="grid w-full grid-cols-[minmax(0,1fr)_240px_minmax(0,1fr)] items-center gap-8 xl:grid-cols-[minmax(0,1fr)_310px_minmax(0,1fr)] xl:gap-12">
            <div ref={journeyLeftRef} className="max-w-[430px] space-y-5">
              <p className="font-utility text-[14px] uppercase tracking-[0.14em] text-[var(--accent-monarch-light)]">
                {JOURNEY_CONTENT.eyebrow}
              </p>

              <h2
                ref={journeyHeadingLeftRef}
                id="journey-heading-desktop"
                className="chapter-display-heading text-[clamp(3.1rem,5.2vw,5.15rem)] leading-[0.88] text-[var(--ink-cream)]"
              >
                {JOURNEY_CONTENT.headlinePlain}
              </h2>

              <p className="font-editorial-serif text-[clamp(1.125rem,1.25vw,1.25rem)] leading-[1.62] text-[var(--ink-cream-soft)]">
                {JOURNEY_CONTENT.paragraphs[0]}
              </p>

              <div className="border-t border-[#f4eee3]/14 pt-3.5">
                <p className="font-utility text-[14px] font-semibold tracking-[0.08em] text-[var(--accent-monarch-light)]">
                  {JOURNEY_CONTENT.milestones[0].period}
                </p>
                <p className="mt-0.5 font-editorial-serif text-[17px] text-[var(--ink-cream)]">
                  {JOURNEY_CONTENT.milestones[0].label}
                </p>
              </div>
            </div>

            <div
              ref={journeyCenterSlotRef}
              data-slot="journey-center-slot"
              aria-hidden="true"
              onPointerEnter={handleJourneyButterflyHover}
              className="h-[420px] w-full"
            />

            <div
              ref={journeyRightRef}
              className="ml-auto max-w-[430px] space-y-5 text-left xl:text-right"
            >
              <p
                ref={journeyHeadingRightRef}
                className="chapter-display-heading text-[clamp(3.1rem,5.2vw,5.15rem)] leading-[0.88] text-[var(--ink-cream)]"
              >
                {renderJourneyAccent(JOURNEY_CONTENT.headlineAccent, true)}
              </p>

              <p className="font-editorial-serif text-[clamp(1.125rem,1.25vw,1.25rem)] leading-[1.62] text-[var(--ink-cream-soft)]">
                {JOURNEY_CONTENT.paragraphs[1]}
              </p>

              <div className="border-t border-[#f4eee3]/14 pt-3.5">
                <p className="font-utility text-[14px] font-semibold tracking-[0.08em] text-[var(--accent-monarch-light)]">
                  {JOURNEY_CONTENT.milestones[1].period}
                </p>
                <p className="mt-0.5 font-editorial-serif text-[17px] text-[var(--ink-cream)]">
                  {JOURNEY_CONTENT.milestones[1].label}
                </p>
              </div>

              <p
                aria-hidden="true"
                className="font-studio-hand text-[24px] text-[var(--ink-cream-soft)]"
              >
                {JOURNEY_CONTENT.handNote}
              </p>
            </div>
          </div>
        </section>

        {/* Page 3 / Act 02: Capabilities & Craft (embedded stage surface) */}
        <div
          ref={craftStageWrapRef}
          data-slot="stage-craft-layer"
          className="invisible pointer-events-none absolute inset-0 z-30"
        >
          <Act02Craft embeddedInStage />
        </div>

        {/* Page 4 / Act 03: Technical Repertoire (embedded stage surface) */}
        <div
          ref={stackStageWrapRef}
          data-slot="stage-stack-layer"
          className="invisible pointer-events-none absolute inset-0 z-30"
        >
          <Act03Stack embeddedInStage />
        </div>
      </div>
    </div>
  );
}
