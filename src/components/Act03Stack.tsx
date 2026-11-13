import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { LayoutGroup, motion } from "motion/react";
import {
  ALL_STACK_TOOLS,
  STACK_COLUMNS,
  STACK_CONTENT,
  STACK_PROJECTS,
  type StackProjectId,
  type StackTool,
  type StackToolId,
} from "../data/profileContent";
import { ensureGsapPlugins, gsap, prefersReducedMotion, revealHeadingLines } from "../lib/scrollEngine";
import { BuildReel, preloadReelScene, useReelPointerMode } from "./BuildReel";

const REEL_OPEN_DELAY_MS = 140;
const REEL_CLOSE_DELAY_MS = 160;

interface PairingSpline {
  id: string;
  d: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Act03StackProps {
  embeddedInStage?: boolean;
}

function readCompactStackViewport(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(max-width: 1023px)").matches;
}

export function Act03Stack({ embeddedInStage = false }: Act03StackProps = {}) {
  const [selectedToolId, setSelectedToolId] = useState<StackToolId | null>(null);
  const [splines, setSplines] = useState<PairingSpline[]>([]);
  const [compactStack, setCompactStack] = useState<boolean>(() =>
    embeddedInStage ? false : readCompactStackViewport(),
  );
  const sectionRef = useRef<HTMLElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef<Partial<Record<StackToolId, HTMLButtonElement | null>>>({});

  useEffect(() => {
    if (embeddedInStage || typeof window === "undefined" || typeof window.matchMedia !== "function") {
      setCompactStack(false);
      return;
    }
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => setCompactStack(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, [embeddedInStage]);

  // Row-major (left-to-right, top-to-bottom line-by-line) sequence indices across all components
  const seqInfo = useMemo(() => {
    let seq = 0;
    const headerLeft = seq++;
    const headerRight = seq++;
    const ledger = seq++;
    const colHeadings = STACK_COLUMNS.map(() => seq++);
    const toolSeq: Partial<Record<StackToolId, number>> = {};
    const maxRows = Math.max(...STACK_COLUMNS.map((col) => col.tools.length));
    for (let r = 0; r < maxRows; r++) {
      for (let c = 0; c < STACK_COLUMNS.length; c++) {
        const tool = STACK_COLUMNS[c]?.tools[r];
        if (tool) {
          toolSeq[tool.id] = seq++;
        }
      }
    }
    const relatedBuilds = seq++;
    return { headerLeft, headerRight, ledger, colHeadings, toolSeq, relatedBuilds };
  }, []);

  const toolMap = useMemo(() => {
    const map = new Map<StackToolId, StackTool>();
    for (const tool of ALL_STACK_TOOLS) {
      map.set(tool.id, tool);
    }
    return map;
  }, []);

  const selectedTool = selectedToolId ? (toolMap.get(selectedToolId) ?? null) : null;
  const pairedSet = useMemo<ReadonlySet<StackToolId>>(
    () => new Set(selectedTool?.pairedIds ?? []),
    [selectedTool],
  );
  const reduced = prefersReducedMotion();

  // Build reels: one open at a time, hover/focus intent on fine pointers, explicit toggle on touch
  const reelPointerMode = useReelPointerMode();
  const [openReelId, setOpenReelId] = useState<StackProjectId | null>(null);
  const reelTimers = useRef<{ open?: number; close?: number }>({});

  const clearReelTimers = useCallback(() => {
    window.clearTimeout(reelTimers.current.open);
    window.clearTimeout(reelTimers.current.close);
    reelTimers.current = {};
  }, []);

  const closeReel = useCallback((projectId?: StackProjectId) => {
    setOpenReelId((prev) => (projectId === undefined || prev === projectId ? null : prev));
  }, []);

  useEffect(() => {
    clearReelTimers();
    setOpenReelId(null);
    if (selectedToolId) preloadReelScene();
  }, [selectedToolId, clearReelTimers]);

  useEffect(() => clearReelTimers, [clearReelTimers]);

  useEffect(() => {
    if (!openReelId) return;
    const section = sectionRef.current;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      clearReelTimers();
      setOpenReelId(null);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (reelPointerMode !== "tap") return;
      const card = event.target instanceof Element ? event.target.closest("[data-project-id]") : null;
      if (card?.getAttribute("data-project-id") !== openReelId) setOpenReelId(null);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    let observer: IntersectionObserver | null = null;
    const card = section?.querySelector(`[data-project-id="${openReelId}"]`);
    if (card && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => !entry.isIntersecting)) setOpenReelId(null);
      });
      observer.observe(card);
    }

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      observer?.disconnect();
    };
  }, [openReelId, reelPointerMode, clearReelTimers]);

  // Keep the last hovered build while its scroll furls away
  const lastReelIdRef = useRef<StackProjectId | null>(null);
  if (openReelId) lastReelIdRef.current = openReelId;
  const hungProject = lastReelIdRef.current ? STACK_PROJECTS[lastReelIdRef.current] : null;

  const scheduleReelOpen = (projectId: StackProjectId) => {
    clearReelTimers();
    if (openReelId === projectId) return;
    // Sweeping from one open reel to the next card swaps immediately
    const delay = openReelId ? 0 : REEL_OPEN_DELAY_MS;
    reelTimers.current.open = window.setTimeout(() => setOpenReelId(projectId), delay);
  };

  const scheduleReelClose = (projectId: StackProjectId) => {
    clearReelTimers();
    reelTimers.current.close = window.setTimeout(() => closeReel(projectId), REEL_CLOSE_DELAY_MS);
  };

  const recomputeSplines = useCallback(() => {
    const clearSplines = () => {
      setSplines((prev) => (prev.length === 0 ? prev : []));
    };

    const container = gridRef.current;
    if (!container || !selectedTool) {
      clearSplines();
      return;
    }

    const containerRect = container.getBoundingClientRect();
    if (containerRect.width < 900 || containerRect.height === 0) {
      clearSplines();
      return;
    }

    const sourceBtn = buttonRefs.current[selectedTool.id];
    if (!sourceBtn) {
      clearSplines();
      return;
    }

    const srcRect = sourceBtn.getBoundingClientRect();
    if (srcRect.width === 0 || srcRect.height === 0) {
      clearSplines();
      return;
    }

    const nextSplines: PairingSpline[] = [];
    for (const targetId of selectedTool.pairedIds) {
      const targetBtn = buttonRefs.current[targetId];
      if (!targetBtn) continue;
      const dstRect = targetBtn.getBoundingClientRect();
      if (dstRect.width === 0 || dstRect.height === 0) continue;

      const srcCenterX = srcRect.left + srcRect.width * 0.5;
      const dstCenterX = dstRect.left + dstRect.width * 0.5;
      const sameColumn = Math.abs(srcCenterX - dstCenterX) < 40;

      const x1 = sameColumn
        ? srcRect.right - containerRect.left - 8
        : srcCenterX < dstCenterX
          ? srcRect.right - containerRect.left
          : srcRect.left - containerRect.left;
      const y1 = srcRect.top - containerRect.top + srcRect.height * 0.5;

      const x2 = sameColumn
        ? dstRect.right - containerRect.left - 8
        : srcCenterX < dstCenterX
          ? dstRect.left - containerRect.left
          : dstRect.right - containerRect.left;
      const y2 = dstRect.top - containerRect.top + dstRect.height * 0.5;

      const dx = Math.abs(x2 - x1);
      const ctrlOffset = sameColumn ? 34 : Math.max(36, dx * 0.42);
      const c1x = sameColumn ? x1 + ctrlOffset : srcCenterX < dstCenterX ? x1 + ctrlOffset : x1 - ctrlOffset;
      const c2x = sameColumn ? x2 + ctrlOffset : srcCenterX < dstCenterX ? x2 - ctrlOffset : x2 + ctrlOffset;

      nextSplines.push({
        id: `${selectedTool.id}-${targetId}`,
        d: `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${c1x.toFixed(1)} ${y1.toFixed(1)}, ${c2x.toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`,
        x1,
        y1,
        x2,
        y2,
      });
    }

    setSplines((prev) => (nextSplines.length === 0 && prev.length === 0 ? prev : nextSplines));
  }, [selectedTool]);

  useEffect(() => {
    recomputeSplines();

    const container = gridRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver(() => {
      recomputeSplines();
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
    };
  }, [recomputeSplines]);

  // Standalone left-to-right, top-to-bottom line-by-line scroll reveal when not driven by desktop stage
  useLayoutEffect(() => {
    if (embeddedInStage) return;
    const section = sectionRef.current;
    if (!section || prefersReducedMotion()) return;
    const rect = section.getBoundingClientRect();
    if (rect.height === 0 || (typeof window !== "undefined" && rect.top <= window.innerHeight * 0.92)) {
      return;
    }

    const seqNodes = Array.from(section.querySelectorAll<HTMLElement>("[data-stack-seq]")).sort(
      (a, b) => Number(a.dataset.stackSeq ?? 0) - Number(b.dataset.stackSeq ?? 0),
    );
    if (seqNodes.length === 0) return;

    ensureGsapPlugins();

    const ctx = gsap.context(() => {
      const heading = section.querySelector<HTMLElement>("#stack-heading");
      if (heading) revealHeadingLines(heading, section, "top 80%");
      gsap.fromTo(
        seqNodes,
        { opacity: 0, x: -16, y: 10 },
        {
          opacity: 1,
          x: 0,
          y: 0,
          duration: 0.56,
          stagger: 0.035,
          ease: "atelier-silk",
          clearProps: "transform,opacity",
          scrollTrigger: {
            trigger: section,
            start: "top 84%",
            once: true,
          },
        },
      );
    }, section);

    return () => {
      ctx.revert();
    };
  }, [embeddedInStage]);

  const inlineMobileBuilds = !embeddedInStage && compactStack;

  const renderSelectedBuilds = (tool: StackTool) => {
    const isSingle = tool.relatedBuilds.length === 1;
    // Ink on the raised rag sheet: terracotta for the live build, espresso for source
    const linkClassPrimary =
      "inline-flex min-h-11 items-center font-utility text-[14px] font-semibold text-[var(--accent-monarch)] underline decoration-[#a64028]/35 underline-offset-4 transition-colors hover:text-[var(--accent-monarch-deep)] hover:decoration-[var(--accent-monarch-deep)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-monarch)] lg:min-h-6";
    const linkClassSecondary =
      "inline-flex min-h-11 items-center font-utility text-[14px] font-medium text-[var(--ink-muted-dark)] underline decoration-[#5b4a3e]/30 underline-offset-4 transition-colors hover:text-[var(--ink-espresso)] hover:decoration-[var(--ink-espresso)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-monarch)] lg:min-h-6";
    const anyReel = tool.relatedBuilds.some((build) => STACK_PROJECTS[build.projectId]?.reel);
    const reelInvitation =
      reelPointerMode === "hover" ? "Hover a build to screen its reel" : "Tap Reel to screen a build";

    const renderReelToggle = (projectId: StackProjectId, title: string) => {
      if (reelPointerMode !== "tap") return null;
      const isOpen = openReelId === projectId;
      return (
        <button
          type="button"
          data-slot="build-reel-toggle"
          aria-pressed={isOpen}
          aria-label={`${title} reel`}
          onClick={() => setOpenReelId((prev) => (prev === projectId ? null : projectId))}
          className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 font-utility text-[14px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-monarch)] ${
            isOpen ? "text-[var(--ink-espresso)]" : "text-[var(--accent-monarch)]"
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-1.5 w-3 rounded-full bg-[var(--accent-brass)] transition-transform duration-300 ${
              isOpen ? "scale-x-75" : ""
            }`}
          />
          Reel
        </button>
      );
    };

    return (
      <motion.div
        key={tool.id}
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0 } : { duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <span aria-hidden="true" className="build-sheet__rule" />
        <div
          className={`flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 border-b border-[#211813]/14 ${
            embeddedInStage ? "pb-1.5" : "pb-2"
          }`}
        >
          <span className="flex flex-wrap items-baseline gap-x-3">
            <span className="font-utility text-[14px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-monarch)]">
              Built with {tool.label}
            </span>
            <span className="font-utility text-[14px] tracking-[0.02em] text-[var(--ink-muted-dark)]">
              {isSingle ? "1 Shipped Build" : `${tool.relatedBuilds.length} Shipped Builds`}
            </span>
          </span>
          {anyReel ? (
            <span className="font-editorial-serif text-[15px] italic text-[var(--ink-body-dark)]">
              {reelInvitation}
            </span>
          ) : null}
        </div>

        <ul
          className={`${embeddedInStage ? "mt-1" : "mt-1.5"} grid grid-cols-1 ${
            // Inline under a tool (compact layouts) the sheet is one column wide: stack the builds
            inlineMobileBuilds
              ? ""
              : tool.relatedBuilds.length === 2
                ? "md:grid-cols-2"
                : tool.relatedBuilds.length >= 3
                  ? "md:grid-cols-3"
                  : ""
          }`}
        >
          {tool.relatedBuilds.map((build) => {
            const project = STACK_PROJECTS[build.projectId];
            if (!project) return null;
            const projectId = build.projectId;
            const reel = project.reel;
            const hoverReels = Boolean(reel) && reelPointerMode === "hover";
            const reelOpen = openReelId === projectId;

            return (
              <li
                key={projectId}
                data-project-id={projectId}
                data-reel-open={reelOpen ? "true" : undefined}
                onPointerEnter={
                  hoverReels
                    ? (event) => {
                        if (event.pointerType === "mouse") scheduleReelOpen(projectId);
                      }
                    : undefined
                }
                onPointerLeave={
                  hoverReels
                    ? (event) => {
                        if (event.pointerType === "mouse") scheduleReelClose(projectId);
                      }
                    : undefined
                }
                onFocus={
                  hoverReels
                    ? () => {
                        clearReelTimers();
                        setOpenReelId(projectId);
                      }
                    : undefined
                }
                onBlur={
                  hoverReels
                    ? (event) => {
                        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                        clearReelTimers();
                        closeReel(projectId);
                      }
                    : undefined
                }
                className={`build-sheet__entry relative border-[#211813]/12 transition-colors duration-300 not-first:border-t ${
                  inlineMobileBuilds ? "" : "md:not-first:border-t-0 md:not-first:border-l"
                } ${
                  reelOpen ? "is-screening" : ""
                } ${embeddedInStage ? "px-3.5 py-2" : "px-4 py-3"} ${
                  isSingle ? "md:flex md:flex-wrap md:items-center md:justify-between md:gap-x-6" : ""
                }`}
              >
                {reel && inlineMobileBuilds ? (
                  <BuildReel
                    projectId={projectId}
                    reel={reel}
                    title={project.title}
                    open={reelOpen}
                    placement="inline"
                    reduced={reduced}
                  />
                ) : null}
                <div className={isSingle ? "space-y-0.5" : ""}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span
                      className={`relative font-editorial-serif font-medium text-[var(--ink-espresso)] ${
                        embeddedInStage ? "text-[17px]" : "text-[18px]"
                      }`}
                    >
                      {reel ? <span aria-hidden="true" className="build-sheet__marker" /> : null}
                      {project.title}
                    </span>

                    {!isSingle ? (
                      <span className="flex items-center gap-3">
                        <a
                          href={project.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${project.title} live deployment`}
                          className={linkClassPrimary}
                        >
                          Live ↗
                        </a>
                        <a
                          href={project.sourceHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${project.title} source repository`}
                          className={linkClassSecondary}
                        >
                          Source ↗
                        </a>
                        {reel ? renderReelToggle(projectId, project.title) : null}
                      </span>
                    ) : null}
                  </div>

                  <p
                    className={`mt-0.5 font-editorial-serif leading-[1.4] text-[var(--ink-body-dark)] ${
                      embeddedInStage ? "text-[14.5px]" : "text-[15.5px]"
                    }`}
                  >
                    {build.usage}
                  </p>
                </div>

                {isSingle ? (
                  <div className="mt-2 flex shrink-0 items-center gap-4 md:mt-0">
                    <a
                      href={project.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${project.title} live deployment`}
                      className={linkClassPrimary}
                    >
                      Live ↗
                    </a>
                    <a
                      href={project.sourceHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${project.title} source repository`}
                      className={linkClassSecondary}
                    >
                      Source ↗
                    </a>
                    {reel ? renderReelToggle(projectId, project.title) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </motion.div>
    );
  };

  return (
    <section
      ref={sectionRef}
      id="stack"
      data-act="03-stack"
      aria-labelledby="stack-heading"
      className={
        embeddedInStage
          ? "material-olive relative flex h-full w-full items-center px-8 pt-[72px] pb-4 lg:px-12"
          : "material-olive relative border-t border-[#f4eee3]/14 px-6 py-24 sm:px-10 lg:px-12 lg:py-32"
      }
    >
      {/* Desktop: one scroll hung centred from the top of the chapter for the hovered build */}
      {!inlineMobileBuilds && hungProject?.reel ? (
        <BuildReel
          projectId={hungProject.id}
          reel={hungProject.reel}
          title={hungProject.title}
          open={openReelId !== null}
          placement="hang"
          reduced={reduced}
        />
      ) : null}

      <div className="mx-auto w-full max-w-[1360px]">
        {/* Editorial header */}
        <div
          className={`grid grid-cols-1 items-end border-b border-[#eae4d7]/16 lg:grid-cols-12 ${
            embeddedInStage ? "gap-5 pb-4" : "gap-8 pb-10"
          }`}
        >
          <div
            data-stack-seq={seqInfo.headerLeft}
            className={embeddedInStage ? "space-y-2 lg:col-span-7" : "space-y-4 lg:col-span-7"}
          >
            <p className="font-utility text-[14px] font-medium uppercase tracking-[0.14em] text-[var(--accent-sage)]">
              {STACK_CONTENT.eyebrow}
            </p>
            <h2
              id="stack-heading"
              className={`chapter-display-heading text-[var(--ink-cream)] ${
                embeddedInStage ? "text-[clamp(2.45rem,4.1vw,3.75rem)]" : ""
              }`}
            >
              {STACK_CONTENT.headlinePlain}
              <em className="font-editorial-italic font-normal text-[var(--accent-sage)]">
                {STACK_CONTENT.headlineItalic}
              </em>
            </h2>
          </div>

          <div
            data-stack-seq={seqInfo.headerRight}
            className={embeddedInStage ? "space-y-1.5 lg:col-span-5" : "space-y-3 lg:col-span-5"}
          >
            <p
              className={`font-editorial-serif text-[var(--ink-olive-cream)] ${
                embeddedInStage
                  ? "text-[16.5px] leading-[1.46]"
                  : "text-[clamp(1.125rem,1.35vw,1.25rem)] leading-[1.6]"
              }`}
            >
              {STACK_CONTENT.lead}
            </p>
            <p
              aria-hidden="true"
              className={`font-studio-hand text-[var(--accent-sage)] ${
                embeddedInStage ? "text-[20px]" : "text-[23px]"
              }`}
            >
              {STACK_CONTENT.handNote}
            </p>
          </div>
        </div>

        {/* Docked stable-height pairing marginalia ledger */}
        <div
          data-slot="stack-pairing-ledger"
          data-stack-seq={seqInfo.ledger}
          aria-live="polite"
          className={`flex flex-col justify-center border border-[#eae4d7]/18 bg-[#18241d]/75 transition-colors duration-300 hover:border-[#cde0c0]/32 ${
            embeddedInStage
              ? "mt-3.5 min-h-[68px] px-5 py-2.5"
              : "mt-8 min-h-[96px] px-5 py-4 sm:px-7"
          }`}
        >
          {selectedTool ? (
            <motion.div
              key={selectedTool.id}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduced
                  ? { duration: 0 }
                  : { duration: 0.36, ease: [0.22, 1, 0.36, 1] }
              }
              className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-utility text-[14px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-sage)]">
                    Active Instrument · {selectedTool.label}
                  </span>
                  <span className="font-utility text-[14px] text-[#cfd9d2]">
                    Pairs with{" "}
                    {selectedTool.pairedIds
                      .map((id) => toolMap.get(id)?.label)
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
                <p
                  className={`font-editorial-serif leading-[1.48] text-[var(--ink-cream)] ${
                    embeddedInStage ? "text-[16.5px]" : "text-[18px]"
                  }`}
                >
                  {selectedTool.craftNote}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedToolId(null)}
                className="editorial-btn-sheen inline-flex min-h-11 shrink-0 items-center justify-center self-start border border-[#cde0c0]/45 px-4 py-1.5 font-utility text-[14px] font-medium text-[var(--ink-cream)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#cde0c0]/14 lg:self-center"
              >
                {STACK_CONTENT.resetLabel}
              </button>
            </motion.div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p
                className={`font-editorial-serif text-[var(--ink-olive-cream)] ${
                  embeddedInStage ? "text-[16.5px]" : "text-[18px]"
                }`}
              >
                All eighteen 2026 instruments shown at full illumination across four studio columns.
              </p>
              <span className="font-utility text-[14px] tracking-[0.08em] text-[var(--accent-sage)]">
                18 Instruments · 4 Columns
              </span>
            </div>
          )}
        </div>

        {/* Four-column tactile olive specimen table + desktop SVG pin-head splines + lower-right builds pocket */}
        <LayoutGroup id={embeddedInStage ? "stack-repertoire-grid-stage" : "stack-repertoire-grid"}>
          <div
            ref={gridRef}
            className={`relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-[auto_1fr] ${
              embeddedInStage ? "mt-4 gap-5 lg:gap-y-3.5" : "mt-10 gap-8 lg:gap-x-7 lg:gap-y-5"
            }`}
          >
            {splines.length > 0 ? (
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full overflow-visible lg:block"
              >
                {splines.map((spline) => (
                  <g key={spline.id}>
                    <motion.path
                      d={spline.d}
                      fill="none"
                      stroke="rgba(205, 224, 192, 0.48)"
                      strokeWidth="1.25"
                      strokeDasharray="4 4"
                      initial={reduced ? false : { pathLength: 0, opacity: 0.35 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={
                        reduced
                          ? { duration: 0 }
                          : { duration: 0.68, ease: [0.22, 1, 0.36, 1] }
                      }
                    />
                    <circle cx={spline.x1} cy={spline.y1} r="2.8" fill="#ffb000" />
                    <circle cx={spline.x2} cy={spline.y2} r="2.8" fill="#cde0c0" />
                  </g>
                ))}
              </svg>
            ) : null}

            {STACK_COLUMNS.map((column, colIdx) => {
              const desktopColPlacement =
                [
                  "lg:col-start-1 lg:row-start-1 lg:row-span-2",
                  "lg:col-start-2 lg:row-start-1",
                  "lg:col-start-3 lg:row-start-1",
                  "lg:col-start-4 lg:row-start-1",
                ][colIdx] ?? "";

              return (
                <div
                  key={column.id}
                  className={`relative z-20 ${desktopColPlacement} ${
                    embeddedInStage ? "space-y-2.5" : "space-y-4"
                  }`}
                >
                  <div
                    data-stack-seq={seqInfo.colHeadings[colIdx]}
                    className={`flex items-baseline justify-between border-b border-[#eae4d7]/20 ${
                      embeddedInStage ? "pb-2" : "pb-3"
                    }`}
                  >
                    <h3
                      className={`font-editorial-serif font-medium text-[var(--ink-cream)] ${
                        embeddedInStage ? "text-[18px]" : "text-[20px]"
                      }`}
                    >
                      {column.title}
                    </h3>
                    <span className="font-utility text-[14px] font-semibold tracking-[0.14em] text-[var(--accent-sage)]">
                      {column.roman}
                    </span>
                  </div>

                  <ul className={embeddedInStage ? "space-y-1.5" : "space-y-2.5"}>
                    {column.tools.map((tool) => {
                      const isSelected = selectedToolId === tool.id;
                      const isPaired = pairedSet.has(tool.id);
                      const isDimmed = selectedToolId !== null && !isSelected && !isPaired;

                      let stateClass =
                        "border-[#eae4d7]/18 bg-[#24352c]/65 text-[var(--ink-cream)] hover:border-[#cde0c0]/55 hover:bg-[#2a3e33]";
                      if (isSelected) {
                        stateClass =
                          "border-[#f7f1e6] bg-[var(--surface-rag)] text-[var(--ink-espresso)] shadow-[0_14px_30px_-14px_rgba(8,14,11,0.75)]";
                      } else if (isPaired) {
                        stateClass =
                          "border-[#cde0c0]/70 bg-[#2c4236] text-[var(--ink-cream)]";
                      } else if (isDimmed) {
                        stateClass =
                          "border-[#eae4d7]/10 bg-[#1a2720]/75 text-[#b7c2ba] hover:border-[#cde0c0]/35 hover:text-[var(--ink-cream)]";
                      }

                      return (
                        <li key={tool.id} data-stack-seq={seqInfo.toolSeq[tool.id]}>
                          <button
                            ref={(el) => {
                              buttonRefs.current[tool.id] = el;
                            }}
                            type="button"
                            data-tool-id={tool.id}
                            aria-pressed={isSelected}
                            onClick={() =>
                              setSelectedToolId((prev) => (prev === tool.id ? null : tool.id))
                            }
                            className={`editorial-btn-sheen group relative flex w-full items-center justify-between gap-3 border text-left transition-all duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 ${
                              embeddedInStage ? "min-h-11 px-3.5 py-1.5" : "min-h-12 px-4 py-2.5"
                            } ${stateClass}`}
                          >
                            <span
                              className={`flex items-center gap-2.5 font-editorial-serif leading-snug transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 ${
                                embeddedInStage ? "text-[16.5px]" : "text-[18px]"
                              }`}
                            >
                              {isSelected ? (
                                <motion.span
                                  layoutId="stack-selected-pin"
                                  transition={
                                    reduced
                                      ? { duration: 0 }
                                      : { type: "spring", stiffness: 290, damping: 28 }
                                  }
                                  aria-hidden="true"
                                  className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent-monarch)]"
                                />
                              ) : null}
                              <span>{tool.label}</span>
                            </span>

                            {isSelected ? (
                              <span
                                aria-hidden="true"
                                className="font-utility text-[14px] font-semibold tracking-[0.06em] text-[var(--accent-monarch-deep)]"
                              >
                                Selected
                              </span>
                            ) : isPaired ? (
                              <span
                                aria-hidden="true"
                                className="font-utility text-[14px] font-medium tracking-[0.06em] text-[var(--accent-sage)]"
                              >
                                Paired
                              </span>
                            ) : null}
                          </button>

                          {inlineMobileBuilds && isSelected ? (
                            <div
                              data-slot="stack-related-builds"
                              aria-live="polite"
                              className="build-sheet mt-2 px-4 py-3.5"
                            >
                              {renderSelectedBuilds(tool)}
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}

            {/* Lower center-right shipped builds pocket under Columns II through IV */}
            <div
              data-slot={
                inlineMobileBuilds && selectedTool
                  ? "stack-related-builds-placeholder"
                  : "stack-related-builds"
              }
              data-stack-seq={seqInfo.relatedBuilds}
              aria-live="polite"
              data-state={selectedTool && !inlineMobileBuilds ? "active" : "idle"}
              className={`relative z-20 transition-[background-color,box-shadow,border-color] duration-500 md:col-span-2 lg:col-span-3 lg:col-start-2 lg:row-start-2 lg:self-end ${
                selectedTool && !inlineMobileBuilds ? "build-sheet" : "border border-[#eae4d7]/16 bg-[#18241d]"
              } ${inlineMobileBuilds && selectedTool ? "hidden" : ""} ${
                embeddedInStage ? "px-4 py-2.5" : "px-5 py-5 sm:px-7"
              }`}
            >
              {selectedTool && !inlineMobileBuilds ? (
                renderSelectedBuilds(selectedTool)
              ) : (
                <div>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#eae4d7]/14 pb-2">
                    <span className="font-utility text-[14px] font-medium uppercase tracking-[0.14em] text-[var(--accent-sage)]">
                      {STACK_CONTENT.relatedEyebrow}
                    </span>
                    <span className="font-utility text-[14px] tracking-[0.06em] text-[#cfd9d2]">
                      {STACK_CONTENT.relatedIdleStatus}
                    </span>
                  </div>
                  <p
                    className={`font-editorial-serif italic leading-[1.48] text-[var(--ink-olive-cream)] ${
                      embeddedInStage ? "mt-2 text-[16px]" : "mt-2.5 text-[17.5px]"
                    }`}
                  >
                    {STACK_CONTENT.relatedIdleNote}
                  </p>
                </div>
              )}
            </div>
          </div>
        </LayoutGroup>
      </div>
    </section>
  );
}
