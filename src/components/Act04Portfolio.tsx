import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent,
} from "react";
import { motion } from "motion/react";
import {
  GITHUB_REPOS_URL,
  PORTFOLIO_CONTENT,
  PORTFOLIO_IMAGE_ALT,
  PORTFOLIO_URL,
} from "../data/profileContent";
import {
  canPlayAmbientLoop,
  ensureGsapPlugins,
  gsap,
  prefersReducedMotion,
  SplitText,
} from "../lib/scrollEngine";
import { MagneticAction } from "./MagneticAction";

export interface Act04PortfolioProps {
  hasPortfolioVideo?: boolean;
  stickyUnderlay?: boolean;
}

const DEFAULT_HAS_PORTFOLIO_VIDEO =
  typeof __HAS_PORTFOLIO_VIDEO__ !== "undefined" ? __HAS_PORTFOLIO_VIDEO__ : false;

export function Act04Portfolio({
  hasPortfolioVideo = DEFAULT_HAS_PORTFOLIO_VIDEO,
  stickyUnderlay = false,
}: Act04PortfolioProps) {
  const [leveled, setLeveled] = useState<boolean>(false);
  const [stickyTop, setStickyTop] = useState<number>(0);
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => prefersReducedMotion());
  const [ambientVideoEligible, setAmbientVideoEligible] = useState<boolean>(() =>
    canPlayAmbientLoop(),
  );
  const [sheen, setSheen] = useState<{ x: number; y: number; active: boolean }>({
    x: 28,
    y: 22,
    active: false,
  });

  const sectionRef = useRef<HTMLElement | null>(null);
  const underlayInnerRef = useRef<HTMLDivElement | null>(null);
  const underlayDimRef = useRef<HTMLDivElement | null>(null);
  const eyebrowRef = useRef<HTMLParagraphElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const descRef = useRef<HTMLParagraphElement | null>(null);
  const handNoteRef = useRef<HTMLParagraphElement | null>(null);
  const ctaRowRef = useRef<HTMLDivElement | null>(null);
  const rightColRef = useRef<HTMLDivElement | null>(null);
  const printFrameRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const threadPathRef = useRef<SVGPathElement | null>(null);

  const hasAutoPlayedRef = useRef<boolean>(false);
  const isPlayingRef = useRef<boolean>(false);

  const reduced = reducedMotion;
  const showPortfolioVideo = hasPortfolioVideo && ambientVideoEligible;

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const tabletMq = window.matchMedia("(min-width: 768px)");
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");

    const sync = () => {
      setReducedMotion(motionMq.matches);
      setAmbientVideoEligible(canPlayAmbientLoop());
    };

    sync();
    tabletMq.addEventListener?.("change", sync);
    motionMq.addEventListener?.("change", sync);

    return () => {
      tabletMq.removeEventListener?.("change", sync);
      motionMq.removeEventListener?.("change", sync);
    };
  }, []);

  // Keep sticky top offset pinned cleanly even if section height exceeds short desktop windows
  useLayoutEffect(() => {
    if (!stickyUnderlay || typeof window === "undefined") {
      setStickyTop(0);
      return;
    }
    const section = sectionRef.current;
    if (!section) return;

    const updateTop = () => {
      const nextTop = Math.min(0, window.innerHeight - section.offsetHeight);
      setStickyTop(nextTop);
    };

    updateTop();
    window.addEventListener("resize", updateTop, { passive: true });
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(updateTop);
      ro.observe(section);
    }

    return () => {
      window.removeEventListener("resize", updateTop);
      ro?.disconnect();
    };
  }, [stickyUnderlay]);

  // Play-once on initial scroll into view + re-trigger on hover without restarting an active playthrough
  const triggerPorchPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video || !showPortfolioVideo) return;
    if (isPlayingRef.current) return;

    isPlayingRef.current = true;
    try {
      video.currentTime = 0;
    } catch {
      // Ignore seek errors if media metadata is still buffered
    }

    try {
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          isPlayingRef.current = false;
        });
      }
    } catch {
      isPlayingRef.current = false;
    }
  }, [showPortfolioVideo]);

  const handlePorchEnded = useCallback(() => {
    isPlayingRef.current = false;
  }, []);

  const handlePorchError = useCallback(() => {
    isPlayingRef.current = false;
    if (videoRef.current) {
      videoRef.current.style.opacity = "0";
    }
  }, []);

  // Uncover sticky Page 5 when keyboard focus moves into an interactive child while occluded behind Page 6 (WCAG 2.2 SC 2.4.11)
  const handleSectionFocusCapture = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      if (!stickyUnderlay || typeof window === "undefined") return;
      const section = sectionRef.current;
      if (!section || event.target === section) return;

      const connectEl = document.getElementById("connect");
      if (!connectEl) return;
      if (connectEl.getBoundingClientRect().top >= window.innerHeight * 0.72) return;

      const stageEl =
        document.querySelector<HTMLElement>('[data-slot="portfolio-connect-stage"]') ?? section;
      const reducedPref = prefersReducedMotion();
      if (window.lenis && !reducedPref) {
        window.lenis.scrollTo(stageEl, { duration: 0.75, force: true });
      } else {
        stageEl.scrollIntoView({ behavior: reducedPref ? "auto" : "smooth", block: "start" });
      }
    },
    [stickyUnderlay],
  );

  useEffect(() => {
    if (!showPortfolioVideo) {
      isPlayingRef.current = false;
      return;
    }
    const target = printFrameRef.current ?? sectionRef.current;
    if (!target || typeof IntersectionObserver === "undefined") return;
    if (hasAutoPlayedRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !hasAutoPlayedRef.current) {
            hasAutoPlayedRef.current = true;
            triggerPorchPlayback();
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(target);
    return () => {
      observer.disconnect();
    };
  }, [showPortfolioVideo, triggerPorchPlayback]);

  // Scroll-scrubbed drafting thread, editorial text reveal, and depth recession as Page 6 slides up over Page 5
  useLayoutEffect(() => {
    const section = sectionRef.current;
    const pathEl = threadPathRef.current;
    if (!section || !pathEl) return;

    ensureGsapPlugins();

    const ctx = gsap.context(() => {
      if (reducedMotion) {
        gsap.set(pathEl, { drawSVG: "100%" });
        return;
      }

      gsap.fromTo(
        pathEl,
        { drawSVG: "0%" },
        {
          drawSVG: "100%",
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top 84%",
            end: "top 34%",
            scrub: 0.58,
          },
        },
      );

      const rect = section.getBoundingClientRect();
      if (rect.height > 0) {
        const splitHeading = headingRef.current
          ? SplitText.create(headingRef.current, {
              type: "lines",
              mask: "lines",
              linesClass: "split-line",
              aria: "none",
            })
          : null;

        const revealTl = gsap.timeline({
          defaults: { ease: "power2.out" },
          scrollTrigger: {
            trigger: section,
            start: "top 86%",
            end: "top 32%",
            scrub: 0.52,
          },
        });

        if (eyebrowRef.current) {
          revealTl.fromTo(
            eyebrowRef.current,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.36 },
            0,
          );
        }
        if (splitHeading?.lines.length) {
          revealTl.fromTo(
            splitHeading.lines,
            { yPercent: 115 },
            { yPercent: 0, duration: 0.44, stagger: 0.08, ease: "power3.out" },
            0.06,
          );
        }

        const copyItems = [descRef.current, handNoteRef.current, ctaRowRef.current].filter(
          (el): el is NonNullable<typeof el> => el !== null,
        );
        if (copyItems.length > 0) {
          revealTl.fromTo(
            copyItems,
            { opacity: 0, y: 24 },
            { opacity: 1, y: 0, duration: 0.42, stagger: 0.1 },
            0.16,
          );
        }

        if (rightColRef.current) {
          revealTl.fromTo(
            rightColRef.current,
            { opacity: 0, y: 34 },
            { opacity: 1, y: 0, duration: 0.5 },
            0.12,
          );
        }

        if (stickyUnderlay && underlayInnerRef.current && underlayDimRef.current) {
          const connectEl = document.getElementById("connect");
          if (connectEl) {
            const recedeTl = gsap.timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                trigger: connectEl,
                start: "top bottom",
                end: "top top",
                scrub: 0.45,
              },
            });
            recedeTl.fromTo(
              underlayInnerRef.current,
              { scale: 1, y: 0 },
              { scale: 0.968, y: -18, duration: 1, immediateRender: false },
              0,
            );
            recedeTl.fromTo(
              underlayDimRef.current,
              { opacity: 0 },
              { opacity: 0.24, duration: 1, immediateRender: false },
              0,
            );
          }
        }
      }
    }, section);

    return () => {
      ctx.revert();
    };
  }, [reducedMotion, stickyUnderlay]);

  const handlePrintMove = (event: PointerEvent<HTMLAnchorElement>) => {
    if (reduced || event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const x = Math.round(((event.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((event.clientY - rect.top) / rect.height) * 100);
    setSheen({ x, y, active: true });
  };

  return (
    <section
      ref={sectionRef}
      id="portfolio"
      data-act="04-portfolio"
      data-sticky-underlay={stickyUnderlay ? "true" : undefined}
      aria-labelledby="portfolio-heading"
      onFocusCapture={handleSectionFocusCapture}
      style={stickyUnderlay ? { top: `${stickyTop}px` } : undefined}
      className={`material-calico relative overflow-x-clip px-6 py-24 sm:px-10 lg:px-12 lg:py-28 ${
        stickyUnderlay ? "z-10 flex min-h-svh flex-col justify-center lg:sticky" : ""
      }`}
    >
      <div ref={underlayInnerRef} className="w-full will-change-transform">
        {/* Scroll-drawn burnt Monarch terracotta drafting thread */}
        <div
          aria-hidden="true"
          className="pointer-events-none mx-auto mb-8 max-w-[1360px]"
        >
          <svg
            viewBox="0 0 1200 84"
            fill="none"
            preserveAspectRatio="none"
            className="h-14 w-full sm:h-20"
          >
            <path
              ref={threadPathRef}
              d="M 16 12 C 310 12, 430 68, 768 68 L 1068 68"
              stroke="#a64028"
              strokeWidth="1.65"
              strokeLinecap="round"
            />
            <circle cx="16" cy="12" r="3" fill="#9f7c46" />
            <circle cx="1068" cy="68" r="3.2" fill="#a64028" />
          </svg>
        </div>

        <div className="mx-auto grid max-w-[1360px] grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-14">
          {/* Left editorial portal copy */}
          <div className="space-y-6 lg:col-span-5">
            <p
              ref={eyebrowRef}
              className="font-utility text-[14px] font-medium uppercase tracking-[0.14em] text-[var(--accent-monarch-deep)]"
            >
              {PORTFOLIO_CONTENT.eyebrow}
            </p>

            <h2
              ref={headingRef}
              id="portfolio-heading"
              className="chapter-display-heading text-[var(--ink-espresso)]"
            >
              {PORTFOLIO_CONTENT.headlinePlain}
              <em className="font-editorial-italic font-normal text-[var(--accent-monarch)]">
                {PORTFOLIO_CONTENT.headlineItalic}
              </em>
            </h2>

            <p
              ref={descRef}
              className="max-w-[500px] font-editorial-serif text-[clamp(1.125rem,1.35vw,1.3125rem)] leading-[1.64] text-[var(--ink-body-dark)]"
            >
              {PORTFOLIO_CONTENT.description}
            </p>

            <p
              ref={handNoteRef}
              aria-hidden="true"
              className="pt-1 font-studio-hand text-[24px] text-[var(--ink-muted-dark)]"
            >
              {PORTFOLIO_CONTENT.handNote}
            </p>

            <div ref={ctaRowRef} className="flex flex-wrap items-center gap-3.5 pt-2">
              <MagneticAction>
                <a
                  href={PORTFOLIO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="editorial-btn-sheen group inline-flex min-h-12 items-center gap-2.5 bg-[var(--ink-espresso)] px-6 py-3 font-utility text-[15px] font-medium tracking-[0.03em] text-[var(--surface-rag)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#34261e]"
                >
                  <span>{PORTFOLIO_CONTENT.primaryLabel}</span>
                  <span
                    aria-hidden="true"
                    className="inline-block transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  >
                    ↗
                  </span>
                </a>
              </MagneticAction>

              <MagneticAction>
                <a
                  href={GITHUB_REPOS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="editorial-btn-sheen group inline-flex min-h-12 items-center gap-2 border border-[#211813]/32 bg-[var(--surface-rag)] px-6 py-3 font-utility text-[15px] font-medium tracking-[0.03em] text-[var(--ink-espresso)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white"
                >
                  <span>{PORTFOLIO_CONTENT.secondaryLabel}</span>
                  <span
                    aria-hidden="true"
                    className="inline-block transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  >
                    ↗
                  </span>
                </a>
              </MagneticAction>
            </div>
          </div>

          {/* Right tilted 1.1deg matted studio print leveling via spring & triggering porch video on hover */}
          <div ref={rightColRef} className="lg:col-span-7">
            <motion.div
              ref={printFrameRef}
              data-slot="portfolio-print-frame"
              onPointerEnter={triggerPorchPlayback}
              initial={false}
              animate={{
                rotate: reduced ? 0 : leveled ? 0 : 1.1,
                y: reduced ? 0 : leveled ? -4 : 0,
              }}
              transition={
                reduced
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 185, damping: 24, mass: 1 }
              }
              className="surface-cotton-rag border border-[#211813]/14 p-3.5 sm:p-5"
            >
              <a
                href={PORTFOLIO_URL}
                target="_blank"
                rel="noopener noreferrer"
                onPointerEnter={() => {
                  setLeveled(true);
                  triggerPorchPlayback();
                }}
                onPointerLeave={() => {
                  setLeveled(false);
                  setSheen((prev) => ({ ...prev, active: false }));
                }}
                onPointerMove={handlePrintMove}
                onFocus={() => setLeveled(true)}
                onBlur={() => setLeveled(false)}
                className="group block focus-visible:outline-offset-4"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#cfc1ab]">
                  <picture>
                    <source srcSet="/media/portfolio-porch.avif" type="image/avif" />
                    <source srcSet="/media/portfolio-porch.webp" type="image/webp" />
                    <img
                      src="/media/portfolio-porch.jpg"
                      alt={PORTFOLIO_IMAGE_ALT}
                      width={1376}
                      height={768}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.018]"
                    />
                  </picture>

                  {showPortfolioVideo ? (
                    <video
                      ref={videoRef}
                      data-slot="portfolio-porch-video"
                      muted
                      playsInline
                      preload="metadata"
                      aria-hidden="true"
                      poster="/media/portfolio-porch.webp"
                      onEnded={handlePorchEnded}
                      onPause={handlePorchEnded}
                      onError={handlePorchError}
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                    >
                      <source src="/media/portfolio-porch-loop.webm" type="video/webm" />
                      <source src="/media/portfolio-porch-loop.mp4" type="video/mp4" />
                    </video>
                  ) : null}

                  {/* Subtle raking sunlight sheen tracking fine pointers */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 transition-opacity duration-300"
                    style={{
                      opacity: sheen.active ? 0.34 : 0.14,
                      background: `radial-gradient(62% 58% at ${sheen.x}% ${sheen.y}%, rgba(255, 248, 232, 0.55), transparent 70%)`,
                    }}
                  />
                </div>

                <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 px-1 pt-1 font-utility text-[14px] text-[var(--ink-muted-dark)]">
                  <span>{PORTFOLIO_CONTENT.caption}</span>
                  <span className="font-medium text-[var(--accent-monarch-deep)] transition-transform group-hover:translate-x-0.5">
                    Enter 3D Space ↗
                  </span>
                </div>
              </a>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Warm depth dim veil as Page 6 (Act05Connect) slides up over Page 5 */}
      <div
        ref={underlayDimRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[#18110d] opacity-0"
      />
    </section>
  );
}
