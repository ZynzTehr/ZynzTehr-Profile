import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import {
  CRAFT_CONTENT,
  CRAFT_DISCIPLINES,
  type CraftDiscipline,
} from "../data/profileContent";
import { ensureGsapPlugins, gsap, prefersReducedMotion, revealHeadingLines } from "../lib/scrollEngine";

const DISCIPLINE_ANGLES = [22, 46, 68, 92] as const;

function shortDisciplineTabLabel(discipline: CraftDiscipline): string {
  if (discipline.id === "frontend-motion") return "Frontend & Motion";
  if (discipline.id === "applied-ai") return "Practical AI";
  return discipline.title.split("&")[0]?.trim() ?? discipline.title;
}

function drawVernierDial(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  angleDeg: number,
) {
  ctx.clearRect(0, 0, width, height);

  const originX = 24;
  const originY = height - 18;
  const outerR = Math.min(width - 32, height - 24);
  const innerR = outerR - 14;

  // Faint outer and inner brass drafting arcs
  ctx.save();
  ctx.strokeStyle = "rgba(159, 124, 70, 0.28)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(originX, originY, outerR, -Math.PI * 0.5, 0);
  ctx.stroke();

  ctx.strokeStyle = "rgba(33, 24, 19, 0.12)";
  ctx.beginPath();
  ctx.arc(originX, originY, innerR, -Math.PI * 0.5, 0);
  ctx.stroke();

  // Vernier degree ticks from 0 to 90 degrees every 5 degrees
  for (let deg = 0; deg <= 90; deg += 5) {
    const rad = (-deg * Math.PI) / 180;
    const isMajor = deg % 15 === 0;
    const r0 = isMajor ? innerR - 5 : innerR;
    const r1 = outerR;
    const x0 = originX + Math.cos(rad) * r0;
    const y0 = originY + Math.sin(rad) * r0;
    const x1 = originX + Math.cos(rad) * r1;
    const y1 = originY + Math.sin(rad) * r1;

    ctx.strokeStyle = isMajor ? "rgba(33, 24, 19, 0.34)" : "rgba(159, 124, 70, 0.26)";
    ctx.lineWidth = isMajor ? 1.15 : 0.75;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  // Active brass divider needle
  const clamped = Math.max(6, Math.min(88, angleDeg));
  const needleRad = (-clamped * Math.PI) / 180;
  const tipX = originX + Math.cos(needleRad) * (outerR + 4);
  const tipY = originY + Math.sin(needleRad) * (outerR + 4);

  ctx.strokeStyle = "rgba(159, 124, 70, 0.88)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  // Pivot pin and burnt-terracotta azimuth bead
  ctx.fillStyle = "#9f7c46";
  ctx.beginPath();
  ctx.arc(originX, originY, 3.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#a64028";
  ctx.beginPath();
  ctx.arc(tipX, tipY, 2.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export interface Act02CraftProps {
  embeddedInStage?: boolean;
}

export function Act02Craft({ embeddedInStage = false }: Act02CraftProps = {}) {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const sectionRef = useRef<HTMLElement | null>(null);
  const leftColRef = useRef<HTMLDivElement | null>(null);
  const specimenWrapRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const arcPathRef = useRef<SVGPathElement | null>(null);
  const dialCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentAngleRef = useRef<number>(DISCIPLINE_ANGLES[0]);

  const activeDiscipline: CraftDiscipline =
    CRAFT_DISCIPLINES[activeIndex] ?? CRAFT_DISCIPLINES[0];
  const targetAngle = DISCIPLINE_ANGLES[activeIndex] ?? DISCIPLINE_ANGLES[0];
  const reduced = prefersReducedMotion();

  // Standalone scroll-entrance reveal when not driven by the desktop pinned stage
  useLayoutEffect(() => {
    if (embeddedInStage) return;
    const section = sectionRef.current;
    const leftCol = leftColRef.current;
    const specimenWrap = specimenWrapRef.current;
    if (!section || !leftCol || !specimenWrap || prefersReducedMotion()) return;
    const rect = section.getBoundingClientRect();
    if (rect.height === 0 || (typeof window !== "undefined" && rect.top <= window.innerHeight * 0.92)) {
      return;
    }

    ensureGsapPlugins();

    const ctx = gsap.context(() => {
      const heading = section.querySelector<HTMLElement>("#craft-heading");
      if (heading) revealHeadingLines(heading, section, "top 80%");
      gsap.fromTo(
        [leftCol, specimenWrap],
        { y: 34, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.88,
          stagger: 0.14,
          ease: "atelier-silk",
          clearProps: "transform,opacity",
          scrollTrigger: {
            trigger: section,
            start: "top 86%",
            once: true,
          },
        },
      );
    }, section);

    return () => {
      ctx.revert();
    };
  }, [embeddedInStage]);

  // Animate GSAP DrawSVGPlugin brass compass arc on discipline switch
  useLayoutEffect(() => {
    const pathEl = arcPathRef.current;
    if (!pathEl) return;

    ensureGsapPlugins();

    const ctx = gsap.context(() => {
      if (prefersReducedMotion()) {
        gsap.set(pathEl, { drawSVG: "100%" });
        return;
      }

      gsap.fromTo(
        pathEl,
        { drawSVG: "0%" },
        {
          drawSVG: "100%",
          duration: 0.88,
          ease: "atelier-silk",
        },
      );
    });

    return () => {
      ctx.revert();
    };
  }, [activeDiscipline.id]);

  // Event-driven sleep-on-settle 2D <canvas> brass vernier azimuth dial (0 idle rAF frames)
  useEffect(() => {
    const canvas = dialCanvasRef.current;
    if (!canvas) return;

    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext("2d");
    } catch {
      ctx = null;
    }
    if (!ctx) return;

    const logicalW = 248;
    const logicalH = 160;
    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    if (canvas.width !== logicalW * dpr || canvas.height !== logicalH * dpr) {
      canvas.width = logicalW * dpr;
      canvas.height = logicalH * dpr;
    }

    const renderAngle = (deg: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawVernierDial(ctx, logicalW, logicalH, deg);
    };

    if (prefersReducedMotion()) {
      currentAngleRef.current = targetAngle;
      renderAngle(targetAngle);
      return;
    }

    let rafId = 0;
    const step = () => {
      const diff = targetAngle - currentAngleRef.current;
      if (Math.abs(diff) < 0.2) {
        currentAngleRef.current = targetAngle;
        renderAngle(targetAngle);
        return;
      }
      currentAngleRef.current += diff * 0.13;
      renderAngle(currentAngleRef.current);
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [targetAngle]);

  const selectAndFocus = (nextIndex: number) => {
    const count = CRAFT_DISCIPLINES.length;
    const wrapped = ((nextIndex % count) + count) % count;
    setActiveIndex(wrapped);
    tabRefs.current[wrapped]?.focus();
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectAndFocus(activeIndex + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectAndFocus(activeIndex - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectAndFocus(0);
    } else if (event.key === "End") {
      event.preventDefault();
      selectAndFocus(CRAFT_DISCIPLINES.length - 1);
    }
  };

  return (
    <section
      ref={sectionRef}
      id="craft"
      data-act="02-craft"
      aria-labelledby="craft-heading"
      className={
        embeddedInStage
          ? "material-limewash relative flex h-full w-full items-center px-8 pt-[72px] pb-5 lg:px-12"
          : "material-limewash relative px-6 py-24 sm:px-10 lg:px-12 lg:py-32"
      }
    >
      <div
        className={`mx-auto grid w-full max-w-[1360px] grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12 ${
          embeddedInStage ? "items-center" : "items-start gap-12 lg:gap-14"
        }`}
      >
        {/* Left poster typography spread */}
        <div
          ref={leftColRef}
          data-slot="craft-left-col"
          className={
            embeddedInStage
              ? "space-y-4 lg:col-span-5"
              : "space-y-6 lg:col-span-5 lg:sticky lg:top-24"
          }
        >
          <p className="font-utility text-[14px] font-medium uppercase tracking-[0.14em] text-[var(--accent-monarch-deep)]">
            {CRAFT_CONTENT.eyebrow}
          </p>

          <h2
            id="craft-heading"
            data-slot="craft-heading"
            className={`chapter-display-heading text-[var(--ink-espresso)] ${
              embeddedInStage ? "text-[clamp(2.9rem,5.3vw,5.25rem)]" : ""
            }`}
          >
            <span className="block">
              {CRAFT_CONTENT.headlineTopPlain}
              <em className="font-editorial-italic font-normal text-[var(--accent-monarch)]">
                {CRAFT_CONTENT.headlineTopItalic}
              </em>
            </span>
            <span className="mt-1 block">
              {CRAFT_CONTENT.headlineBottomPlain}
              <em className="font-editorial-italic font-normal text-[var(--accent-monarch)]">
                {CRAFT_CONTENT.headlineBottomItalic}
              </em>
            </span>
          </h2>

          <p className="max-w-[490px] font-editorial-serif text-[clamp(1.0625rem,1.25vw,1.25rem)] leading-[1.6] text-[var(--ink-body-dark)]">
            {CRAFT_CONTENT.lead}
          </p>

          <p
            aria-hidden="true"
            className="pt-1 font-studio-hand text-[23px] text-[var(--ink-muted-dark)]"
          >
            {CRAFT_CONTENT.handNote}
          </p>
        </div>

        {/* Right cotton-rag interactive four-discipline drafting specimen */}
        <div ref={specimenWrapRef} className="lg:col-span-7">
          <div
            data-slot="craft-specimen-plate"
            className={`surface-cotton-rag border border-[#211813]/14 transition-shadow duration-500 hover:shadow-[0_28px_60px_-22px_rgba(33,24,19,0.3)] ${
              embeddedInStage ? "p-5 sm:p-6 lg:p-7" : "p-6 sm:p-8 lg:p-10"
            }`}
          >
            <div data-slot="craft-card-inner">
              {/* Roving-tabIndex discipline selector rail */}
              <LayoutGroup id={embeddedInStage ? "craft-discipline-tabs-stage" : "craft-discipline-tabs"}>
                <div
                  role="tablist"
                  aria-label="Engineering disciplines"
                  onKeyDown={handleTabKeyDown}
                  className="grid grid-cols-2 gap-2 border-b border-[#211813]/14 pb-2.5 sm:grid-cols-4"
                >
                  {CRAFT_DISCIPLINES.map((discipline, idx) => {
                    const isActive = idx === activeIndex;
                    return (
                      <button
                        key={discipline.id}
                        ref={(el) => {
                          tabRefs.current[idx] = el;
                        }}
                        id={`craft-tab-${discipline.id}`}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={`craft-panel-${discipline.id}`}
                        tabIndex={isActive ? 0 : -1}
                        onClick={() => setActiveIndex(idx)}
                        className={`group relative flex min-h-11 flex-col items-start justify-center px-3 py-1.5 text-left transition-all duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                          isActive
                            ? "bg-[#211813]/[0.03] text-[var(--ink-espresso)]"
                            : "text-[var(--ink-muted-dark)] hover:bg-[#211813]/[0.025] hover:text-[var(--ink-espresso)]"
                        }`}
                      >
                        <span className="font-utility text-[14px] font-semibold tracking-[0.12em] text-[var(--accent-monarch-deep)] transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5">
                          {discipline.index}{" "}
                        </span>
                        <span className="mt-0.5 line-clamp-1 font-utility text-[14px] font-medium leading-snug transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5">
                          {shortDisciplineTabLabel(discipline)}
                        </span>

                        {isActive ? (
                          <motion.span
                            layoutId="craft-active-nib"
                            transition={
                              reduced
                                ? { duration: 0 }
                                : { type: "spring", stiffness: 260, damping: 28 }
                            }
                            className="pointer-events-none absolute inset-x-2 -bottom-[11px] h-[2.5px] bg-[var(--accent-monarch)]"
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </LayoutGroup>

              {/* Specimen header + brass vernier azimuth dial & DrawSVG compass arc */}
              <div
                className={`flex flex-col justify-between gap-4 border-b border-[#211813]/12 sm:flex-row sm:items-center ${
                  embeddedInStage ? "mt-4 pb-4" : "mt-7 gap-6 pb-6"
                }`}
              >
                <div className="space-y-1">
                  <p className="font-utility text-[14px] uppercase tracking-[0.14em] text-[var(--ink-muted-dark)]">
                    Plate {activeDiscipline.index} of 04 · Studio Standard
                  </p>
                  <p className="font-editorial-italic text-[18px] text-[var(--ink-body-dark)]">
                    {activeDiscipline.summary}
                  </p>
                </div>

                <div
                  aria-hidden="true"
                  className={`relative shrink-0 self-end sm:self-center ${
                    embeddedInStage ? "h-[96px] w-[164px]" : "h-[128px] w-[204px]"
                  }`}
                >
                  <canvas
                    ref={dialCanvasRef}
                    className="pointer-events-none absolute inset-0 h-full w-full"
                  />
                  <svg
                    viewBox="0 0 248 160"
                    className="pointer-events-none absolute inset-0 h-full w-full"
                  >
                    <path
                      ref={arcPathRef}
                      d={activeDiscipline.arcPath}
                      fill="none"
                      stroke="#a64028"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Stable-height specimen detail panel */}
              <div
                id={`craft-panel-${activeDiscipline.id}`}
                role="tabpanel"
                aria-labelledby={`craft-tab-${activeDiscipline.id}`}
                className={
                  embeddedInStage
                    ? "mt-4 min-h-[224px]"
                    : "mt-7 min-h-[300px] sm:min-h-[268px]"
                }
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={activeDiscipline.id}
                    initial={reduced ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, y: -10 }}
                    transition={
                      reduced
                        ? { duration: 0 }
                        : { duration: 0.36, ease: [0.22, 1, 0.36, 1] }
                    }
                    className={embeddedInStage ? "space-y-4" : "space-y-6"}
                  >
                    <h3
                      className={`font-display-didone leading-[0.92] text-[var(--ink-espresso)] ${
                        embeddedInStage
                          ? "text-[clamp(2rem,3.3vw,2.8rem)]"
                          : "text-[clamp(2.4rem,4.6vw,3.6rem)]"
                      }`}
                    >
                      {activeDiscipline.title}
                    </h3>

                    <p
                      className={`font-editorial-serif text-[var(--ink-body-dark)] ${
                        embeddedInStage
                          ? "text-[17px] leading-[1.54]"
                          : "text-[19px] leading-[1.64]"
                      }`}
                    >
                      {activeDiscipline.detail}
                    </p>

                    <ul
                      className={`grid grid-cols-1 gap-2.5 border-t border-[#211813]/12 sm:grid-cols-3 ${
                        embeddedInStage ? "pt-3.5" : "gap-3 pt-5"
                      }`}
                    >
                      {activeDiscipline.deliverables.map((item) => (
                        <li
                          key={item}
                          className="group flex items-start gap-2.5 font-utility text-[14px] leading-[1.42] text-[var(--ink-espresso)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:translate-x-1"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rotate-45 bg-[var(--accent-brass)] transition-all duration-300 group-hover:rotate-90 group-hover:bg-[var(--accent-monarch)]"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
