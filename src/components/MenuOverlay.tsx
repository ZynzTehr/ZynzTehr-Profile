import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CHAPTER_ITEMS,
  CONTACT_EMAIL,
  GITHUB_REPOS_URL,
  PORTFOLIO_URL,
} from "../data/profileContent";
import {
  focusAnchorTarget,
  navigateToAnchor,
  prefersReducedMotion,
} from "../lib/scrollEngine";

export interface MenuOverlayProps {
  open: boolean;
  activeAct: string;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

const EXIT_FALLBACK_MS = 640;
const SILK_EASE: [number, number, number, number] = [0.33, 0, 0.2, 1];

const TOUCH_QUERY = "(hover: none), (pointer: coarse)";

/** Touch screens get an always-labelled close control and a swipe-to-close sheet. */
function useTouchScreen(): boolean {
  const [touch, setTouch] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(TOUCH_QUERY).matches
      : false,
  );
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(TOUCH_QUERY);
    const sync = () => setTouch(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);
  return touch;
}

/** Swipe distance or flick speed that dismisses the sheet. */
const SWIPE_CLOSE_OFFSET = 80;
const SWIPE_CLOSE_VELOCITY = 420;

function hasOtherOpenDialog(self: HTMLDialogElement | null): boolean {
  if (typeof document === "undefined") return false;
  return Array.from(document.querySelectorAll("dialog[open]")).some((d) => d !== self);
}

export function MenuOverlay({
  open,
  activeAct,
  onClose,
  returnFocusRef,
}: MenuOverlayProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const wasOpenRef = useRef(false);
  const openRef = useRef(open);
  const pendingAnchorRef = useRef<string | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [closeHovered, setCloseHovered] = useState(false);
  const [sheetPresent, setSheetPresent] = useState(false);

  openRef.current = open;

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const finalizeDialogClose = useCallback(() => {
    clearCloseTimer();
    if (openRef.current || !wasOpenRef.current) return;
    wasOpenRef.current = false;

    const dialog = dialogRef.current;
    if (dialog && dialog.open) {
      if (typeof dialog.close === "function") {
        try {
          dialog.close();
        } catch {
          dialog.removeAttribute("open");
        }
      } else {
        dialog.removeAttribute("open");
      }
    }

    const pendingAnchor = pendingAnchorRef.current;
    pendingAnchorRef.current = null;

    if (!document.querySelector("dialog[open]")) {
      window.lenis?.start();
      if (pendingAnchor) {
        focusAnchorTarget(pendingAnchor);
      } else {
        returnFocusRef?.current?.focus({ preventScroll: true });
      }
    }
  }, [clearCloseTimer, returnFocusRef]);

  const dismiss = useCallback(() => {
    setCloseHovered(false);
    onClose();
  }, [onClose]);

  const handleChapterSelect = useCallback(
    (href: string) => {
      pendingAnchorRef.current = href;
      if (!hasOtherOpenDialog(dialogRef.current)) {
        window.lenis?.start();
      }
      dismiss();
      requestAnimationFrame(() => {
        navigateToAnchor(href, { focusTarget: false });
      });
    },
    [dismiss],
  );

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      clearCloseTimer();
      pendingAnchorRef.current = null;
      wasOpenRef.current = true;
      setCloseHovered(false);
      window.lenis?.stop();

      // Open top-layer <dialog> BEFORE mounting motion children so frame 0 starts cleanly offscreen
      if (!dialog.open) {
        if (typeof dialog.showModal === "function") {
          try {
            dialog.showModal();
          } catch {
            dialog.setAttribute("open", "");
          }
        } else {
          dialog.setAttribute("open", "");
        }
      }

      setSheetPresent(true);
    } else {
      setCloseHovered(false);
      setSheetPresent(false);
      if (wasOpenRef.current) {
        // Unlock smooth scroll immediately on dismiss so wheel and chapter jumps respond during fade-out
        if (!hasOtherOpenDialog(dialog)) {
          window.lenis?.start();
        }
        if (prefersReducedMotion()) {
          finalizeDialogClose();
        } else {
          clearCloseTimer();
          closeTimerRef.current = setTimeout(finalizeDialogClose, EXIT_FALLBACK_MS);
        }
      }
    }
  }, [clearCloseTimer, finalizeDialogClose, open]);

  useLayoutEffect(() => {
    if (open && sheetPresent) {
      closeButtonRef.current?.focus({ preventScroll: true });
    }
  }, [open, sheetPresent]);

  useEffect(() => {
    return () => {
      clearCloseTimer();
      pendingAnchorRef.current = null;
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        if (!document.querySelector("dialog[open]")) {
          window.lenis?.start();
        }
      }
    };
  }, [clearCloseTimer]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dismiss, open]);

  const reduced = prefersReducedMotion();
  const touchScreen = useTouchScreen();
  const showCloseLabel = closeHovered || touchScreen;

  return (
    <dialog
      ref={dialogRef}
      id="atelier-menu-dialog"
      data-slot="menu-overlay"
      data-lenis-prevent
      aria-labelledby="atelier-menu-heading"
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          dismiss();
        }
      }}
      className={`m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-transparent p-0 text-[var(--ink-cream)] backdrop:bg-transparent ${
        open ? "" : "pointer-events-none"
      }`}
    >
      <AnimatePresence onExitComplete={finalizeDialogClose}>
        {sheetPresent ? (
          <motion.div
            key="atelier-menu-backdrop"
            data-slot="menu-backdrop"
            initial={
              reduced
                ? false
                : { opacity: 0, backdropFilter: "blur(0px)" }
            }
            animate={{ opacity: 1, backdropFilter: "blur(6px)" }}
            exit={
              reduced
                ? { opacity: 0 }
                : {
                    opacity: 0,
                    backdropFilter: "blur(0px)",
                    transition: { duration: 0.48, ease: SILK_EASE },
                  }
            }
            transition={
              reduced
                ? { duration: 0 }
                : { duration: 0.62, ease: SILK_EASE }
            }
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                dismiss();
              }
            }}
            className="flex h-full w-full justify-end overflow-hidden bg-[#140e0b]/72"
          >
            <motion.div
              data-slot="menu-sheet"
              data-swipe={touchScreen && !reduced ? "close" : undefined}
              // Touch: drag the sheet back toward the right edge to close it
              drag={touchScreen && !reduced ? "x" : false}
              dragDirectionLock
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0, right: 0.7 }}
              dragMomentum={false}
              onDragEnd={(_, info) => {
                if (info.offset.x > SWIPE_CLOSE_OFFSET || info.velocity.x > SWIPE_CLOSE_VELOCITY) {
                  dismiss();
                }
              }}
              initial={reduced ? false : { x: "100%", opacity: 0 }}
              animate={{ x: "0%", opacity: 1 }}
              exit={
                reduced
                  ? { opacity: 0 }
                  : {
                      x: "100%",
                      opacity: 0,
                      transition: {
                        x: { duration: 0.48, ease: SILK_EASE },
                        opacity: { duration: 0.4, ease: SILK_EASE },
                      },
                    }
              }
              transition={
                reduced
                  ? { duration: 0 }
                  : {
                      x: { duration: 0.72, ease: SILK_EASE },
                      opacity: { duration: 0.46, ease: SILK_EASE },
                    }
              }
              className="material-espresso relative flex h-full w-[calc(100%-3rem)] max-w-[560px] flex-col justify-between overflow-y-auto border-l border-[#f4eee3]/16 px-6 py-6 shadow-[-28px_0_64px_rgba(8,5,4,0.52)] will-change-transform sm:w-full sm:px-10 sm:py-8"
            >
              {touchScreen ? (
                <span
                  aria-hidden="true"
                  data-slot="menu-swipe-grip"
                  className="pointer-events-none absolute top-1/2 left-1.5 h-14 w-[3px] -translate-y-1/2 rounded-full bg-[#f4eee3]/28"
                />
              ) : null}
              <motion.div
                initial={reduced ? false : { opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  reduced
                    ? { duration: 0 }
                    : { duration: 0.52, delay: 0.22, ease: SILK_EASE }
                }
                className="flex items-center justify-between border-b border-[#f4eee3]/14 pb-5"
              >
                <div>
                  <p className="font-utility text-[14px] uppercase tracking-[0.14em] text-[var(--ink-cream-soft)]">
                    Edition II · Studio Index
                  </p>
                  <h2
                    id="atelier-menu-heading"
                    className="mt-1 font-editorial-italic text-[20px] text-[var(--ink-cream)]"
                  >
                    The Atelier Folio
                  </h2>
                </div>

                <motion.button
                  ref={closeButtonRef}
                  type="button"
                  data-slot="menu-close-button"
                  aria-label="Close menu"
                  onClick={dismiss}
                  onPointerEnter={() => setCloseHovered(true)}
                  onPointerLeave={() => setCloseHovered(false)}
                  layout={!reduced}
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 280, damping: 28, mass: 0.85 }
                  }
                  className="editorial-btn-sheen relative inline-flex min-h-12 min-w-12 items-center justify-center gap-1.5 overflow-hidden border border-[#f4eee3]/28 px-3.5 font-utility text-[14px] font-medium tracking-[0.05em] text-[var(--ink-cream)] transition-[color,background-color,border-color,transform] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[#f4eee3]/55 hover:bg-[#f4eee3]/10 active:scale-[0.96] active:bg-[#f4eee3]/14"
                >
                  {touchScreen ? (
                    <svg
                      aria-hidden="true"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                    >
                      <path d="M6 6L18 18" />
                      <path d="M18 6L6 18" />
                    </svg>
                  ) : null}
                  <AnimatePresence mode="popLayout" initial={false}>
                    {showCloseLabel ? (
                      <motion.span
                        key="close-label"
                        data-slot="menu-close-text"
                        initial={reduced ? false : { opacity: 0, x: -8, scale: 0.92 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={reduced ? { opacity: 0 } : { opacity: 0, x: -7, scale: 0.92 }}
                        transition={
                          reduced
                            ? { duration: 0 }
                            : { duration: 0.34, ease: [0.22, 1, 0.36, 1] }
                        }
                        className="inline-block px-1"
                      >
                        Close
                      </motion.span>
                    ) : (
                      <motion.span
                        key="close-arrow"
                        data-slot="menu-close-arrow"
                        aria-hidden="true"
                        initial={reduced ? false : { opacity: 0, x: -8, scale: 0.88 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={reduced ? { opacity: 0 } : { opacity: 0, x: 7, scaleX: 0.65 }}
                        transition={
                          reduced
                            ? { duration: 0 }
                            : { duration: 0.34, ease: [0.22, 1, 0.36, 1] }
                        }
                        className="inline-flex items-center justify-center"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 12H19" />
                          <path d="M13 6L19 12L13 18" />
                        </svg>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </motion.div>

              <nav aria-label="Folio chapters" className="my-8">
                <ol className="divide-y divide-[#f4eee3]/12 border-y border-[#f4eee3]/12">
                  <motion.li
                    initial={reduced ? false : { opacity: 0, x: 26 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={
                      reduced
                        ? { duration: 0 }
                        : { duration: 0.54, delay: 0.26, ease: SILK_EASE }
                    }
                  >
                    <a
                      href="#hero"
                      onClick={(event) => {
                        event.preventDefault();
                        handleChapterSelect("#hero");
                      }}
                      className="group relative flex min-h-14 items-baseline justify-between gap-4 py-3.5 transition-colors duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-[var(--accent-monarch-light)]"
                    >
                      <span className="w-8 font-utility text-[14px] tracking-[0.12em] text-[var(--ink-cream-soft)] transition-colors duration-[420ms] group-hover:text-[var(--accent-monarch-light)]">
                        00
                      </span>
                      <span className="flex-1 font-display-didone text-[clamp(2rem,4.5vw,2.85rem)] leading-[0.95] transition-transform duration-[440ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-2">
                        Opening Folio
                      </span>
                      <span className="font-utility text-[14px] text-[var(--ink-cream-soft)] transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1">
                        Top
                      </span>
                    </a>
                  </motion.li>

                  {CHAPTER_ITEMS.map((chapter, idx) => {
                    const isCurrent = chapter.actAttr === activeAct;
                    return (
                      <motion.li
                        key={chapter.id}
                        initial={reduced ? false : { opacity: 0, x: 26 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={
                          reduced
                            ? { duration: 0 }
                            : {
                                duration: 0.54,
                                delay: 0.31 + idx * 0.055,
                                ease: SILK_EASE,
                              }
                        }
                      >
                        <a
                          href={chapter.href}
                          aria-current={isCurrent ? "location" : undefined}
                          onClick={(event) => {
                            event.preventDefault();
                            handleChapterSelect(chapter.href);
                          }}
                          className="group relative flex min-h-14 items-baseline justify-between gap-4 py-3.5 transition-colors duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-[var(--accent-monarch-light)]"
                        >
                          <span className="w-8 font-utility text-[14px] tracking-[0.12em] text-[var(--accent-monarch-light)]">
                            {chapter.numeral}
                          </span>
                          <span className="flex-1 font-display-didone text-[clamp(2rem,4.5vw,2.85rem)] leading-[0.95] transition-transform duration-[440ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-2">
                            {chapter.label}
                          </span>
                          <span className="font-utility text-[14px] text-[var(--ink-cream-soft)] transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1">
                            {isCurrent ? "Reading" : "Jump"}
                          </span>
                        </a>
                      </motion.li>
                    );
                  })}
                </ol>
              </nav>

              <motion.div
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  reduced
                    ? { duration: 0 }
                    : { duration: 0.54, delay: 0.52, ease: SILK_EASE }
                }
                className="space-y-3 border-t border-[#f4eee3]/14 pt-5 font-utility text-[14px]"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={PORTFOLIO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="editorial-btn-sheen group inline-flex min-h-11 items-center gap-1.5 bg-[var(--surface-rag)] px-4 py-2 font-medium text-[var(--ink-espresso)] transition-all duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-white"
                  >
                    <span>Live Portfolio</span>
                    <span
                      aria-hidden="true"
                      className="inline-block transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    >
                      ↗
                    </span>
                  </a>
                  <a
                    href={GITHUB_REPOS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="editorial-btn-sheen group inline-flex min-h-11 items-center gap-1.5 border border-[#f4eee3]/26 px-4 py-2 font-medium text-[var(--ink-cream)] transition-all duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-[#f4eee3]/55 hover:bg-[#f4eee3]/10"
                  >
                    <span>All GitHub Repos</span>
                    <span
                      aria-hidden="true"
                      className="inline-block transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    >
                      ↗
                    </span>
                  </a>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[var(--ink-cream-soft)]">
                  <span>Direct mail:</span>
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="inline-flex min-h-11 items-center underline decoration-[#e49a7e]/60 underline-offset-4 transition-colors duration-[420ms] hover:text-white"
                  >
                    {CONTACT_EMAIL}
                  </a>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </dialog>
  );
}
