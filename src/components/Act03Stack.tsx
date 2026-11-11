import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { LayoutGroup, motion } from "motion/react";
import {
  ALL_STACK_TOOLS,
  STACK_COLUMNS,
  STACK_CONTENT,
  type StackTool,
  type StackToolId,
} from "../data/profileContent";
import { ensureGsapPlugins, gsap, prefersReducedMotion } from "../lib/scrollEngine";

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

export function Act03Stack({ embeddedInStage = false }: Act03StackProps = {}) {
  const [selectedToolId, setSelectedToolId] = useState<StackToolId | null>(null);
  const [splines, setSplines] = useState<PairingSpline[]>([]);
  const sectionRef = useRef<HTMLElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef<Partial<Record<StackToolId, HTMLButtonElement | null>>>({});

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
    return { headerLeft, headerRight, ledger, colHeadings, toolSeq };
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

        {/* Four-column tactile olive specimen table + desktop SVG pin-head splines */}
        <LayoutGroup id={embeddedInStage ? "stack-repertoire-grid-stage" : "stack-repertoire-grid"}>
          <div
            ref={gridRef}
            className={`relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 ${
              embeddedInStage ? "mt-4 gap-5" : "mt-10 gap-8 lg:gap-7"
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

            {STACK_COLUMNS.map((column, colIdx) => (
              <div
                key={column.id}
                className={`relative z-20 ${embeddedInStage ? "space-y-2.5" : "space-y-4"}`}
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
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </LayoutGroup>
      </div>
    </section>
  );
}
