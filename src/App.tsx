import { useCallback, useEffect, useRef, useState } from "react";
import { Act02Craft } from "./components/Act02Craft";
import { Act03Stack } from "./components/Act03Stack";
import { Act04Portfolio } from "./components/Act04Portfolio";
import { Act05Connect } from "./components/Act05Connect";
import { ChapterBar } from "./components/ChapterBar";
import { ColophonSheet } from "./components/ColophonSheet";
import { HeroJourneyStage } from "./components/HeroJourneyStage";
import { MenuOverlay } from "./components/MenuOverlay";
import { ScrollPlumbBar } from "./components/ScrollPlumbBar";
import {
  initScrollEngine,
  isDesktopStageEligible,
  prefersReducedMotion,
} from "./lib/scrollEngine";

export function App() {
  const [activeAct, setActiveAct] = useState<string>("00-hero");
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [colophonOpen, setColophonOpen] = useState<boolean>(false);
  const [scrollHintHovered, setScrollHintHovered] = useState<boolean>(false);
  const [heroIntroStarted, setHeroIntroStarted] = useState<boolean>(() =>
    prefersReducedMotion(),
  );
  const [desktopStageActive, setDesktopStageActive] = useState<boolean>(() =>
    isDesktopStageEligible(),
  );
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const colophonTriggerRef = useRef<HTMLButtonElement | null>(null);
  const handleHeroIntroStart = useCallback(() => {
    setHeroIntroStarted(true);
  }, []);

  useEffect(() => {
    const engine = initScrollEngine();
    return () => {
      engine.destroy();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const widthMq = window.matchMedia("(min-width: 900px)");
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncDesktopStage = () => {
      setDesktopStageActive(isDesktopStageEligible());
    };

    syncDesktopStage();
    widthMq.addEventListener?.("change", syncDesktopStage);
    motionMq.addEventListener?.("change", syncDesktopStage);
    window.addEventListener("resize", syncDesktopStage, { passive: true });

    return () => {
      widthMq.removeEventListener?.("change", syncDesktopStage);
      motionMq.removeEventListener?.("change", syncDesktopStage);
      window.removeEventListener("resize", syncDesktopStage);
    };
  }, []);

  // Zero-input Cmd+K / Ctrl+K shortcut toggling the MenuOverlay folio index
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey) {
        if (event.key.toLowerCase() === "k") {
          event.preventDefault();
          setColophonOpen(false);
          setMenuOpen((prev) => !prev);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || typeof window === "undefined") return;

    const selector = desktopStageActive
      ? '[data-act="04-portfolio"], [data-act="05-connect"]'
      : '[data-act="00-hero"], [data-act="01-journey"], [data-act="02-craft"], [data-act="03-stack"], [data-act="04-portfolio"], [data-act="05-connect"]';

    const sections = Array.from(document.querySelectorAll<HTMLElement>(selector));
    if (sections.length === 0) return;

    let portfolioIntersecting = false;
    let connectIntersecting = false;

    const observer = new IntersectionObserver(
      (entries) => {
        if (desktopStageActive) {
          for (const entry of entries) {
            const act = entry.target.getAttribute("data-act");
            if (act === "04-portfolio") {
              portfolioIntersecting = entry.isIntersecting;
            } else if (act === "05-connect") {
              connectIntersecting = entry.isIntersecting;
            }
          }
          if (connectIntersecting) {
            setActiveAct("05-connect");
          } else if (portfolioIntersecting) {
            setActiveAct("04-portfolio");
          }
          return;
        }

        // Derive the act from positions rather than which entry fired: the stacked hero is
        // sticky (Journey slides over it), so it never leaves the band on the way back up.
        if (entries.length === 0) return;
        const probe = window.innerHeight * 0.55;
        let current: HTMLElement = sections[0]!;
        for (const section of sections) {
          if (section.getBoundingClientRect().top <= probe) current = section;
        }
        const act = current.getAttribute("data-act");
        if (act) setActiveAct(act);
      },
      { rootMargin: "-35% 0px -45% 0px", threshold: 0.01 },
    );

    for (const section of sections) {
      observer.observe(section);
    }

    return () => {
      observer.disconnect();
    };
  }, [desktopStageActive]);

  return (
    <div className="min-h-screen material-travertine text-[var(--ink-espresso)]">
      <ScrollPlumbBar
        activeAct={activeAct}
        anchorHovered={scrollHintHovered}
        introReady={heroIntroStarted}
      />

      <ChapterBar
        activeAct={activeAct}
        menuOpen={menuOpen}
        onOpenMenu={() => {
          setColophonOpen(false);
          setMenuOpen(true);
        }}
        menuTriggerRef={menuTriggerRef}
      />

      <MenuOverlay
        open={menuOpen}
        activeAct={activeAct}
        onClose={() => setMenuOpen(false)}
        returnFocusRef={menuTriggerRef}
      />

      <ColophonSheet
        open={colophonOpen}
        onClose={() => setColophonOpen(false)}
        returnFocusRef={colophonTriggerRef}
      />

      <main>
        <HeroJourneyStage
          delegatedPlumbBar
          onScrollHintHoverChange={setScrollHintHovered}
          onActiveActChange={setActiveAct}
          onHeroIntroStart={handleHeroIntroStart}
        />
        {desktopStageActive ? null : (
          <>
            <Act02Craft />
            <Act03Stack />
          </>
        )}
        <div data-slot="portfolio-connect-stage" className="relative">
          <Act04Portfolio stickyUnderlay={desktopStageActive} />
          <Act05Connect
            slideOverStage={desktopStageActive}
            colophonOpen={colophonOpen}
            onOpenColophon={() => {
              setMenuOpen(false);
              setColophonOpen(true);
            }}
            colophonTriggerRef={colophonTriggerRef}
          />
        </div>
      </main>
    </div>
  );
}
