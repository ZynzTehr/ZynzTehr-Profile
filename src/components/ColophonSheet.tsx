import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";
import { COLOPHON_CONTENT } from "../data/profileContent";
import {
  lockPageScroll,
  prefersReducedMotion,
  unlockPageScroll,
} from "../lib/scrollEngine";

export interface ColophonSheetProps {
  open: boolean;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

const EXIT_FALLBACK_MS = 580;
const SILK_EASE: [number, number, number, number] = [0.33, 0, 0.2, 1];

function hasOtherOpenDialog(self: HTMLDialogElement | null): boolean {
  if (typeof document === "undefined") return false;
  return Array.from(document.querySelectorAll("dialog[open]")).some((d) => d !== self);
}

export function ColophonSheet({
  open,
  onClose,
  returnFocusRef,
}: ColophonSheetProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const wasOpenRef = useRef<boolean>(false);
  const openRef = useRef<boolean>(open);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [panelPresent, setPanelPresent] = useState(false);

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

    if (!document.querySelector("dialog[open]")) {
      unlockPageScroll();
      returnFocusRef?.current?.focus({ preventScroll: true });
    }
  }, [clearCloseTimer, returnFocusRef]);

  const dismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      clearCloseTimer();
      wasOpenRef.current = true;
      lockPageScroll();

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

      setPanelPresent(true);
    } else {
      setPanelPresent(false);
      if (wasOpenRef.current) {
        if (!hasOtherOpenDialog(dialog)) {
          unlockPageScroll();
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
    if (open && panelPresent) {
      closeButtonRef.current?.focus({ preventScroll: true });
    }
  }, [open, panelPresent]);

  useEffect(() => {
    return () => {
      clearCloseTimer();
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        if (!document.querySelector("dialog[open]")) {
          unlockPageScroll();
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

  return (
    <dialog
      ref={dialogRef}
      id="atelier-colophon-dialog"
      data-slot="colophon-sheet"
      data-lenis-prevent
      aria-labelledby="atelier-colophon-heading"
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          dismiss();
        }
      }}
      className={`m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-transparent p-0 text-[var(--ink-espresso)] backdrop:bg-transparent ${
        open ? "" : "pointer-events-none"
      }`}
    >
      <AnimatePresence onExitComplete={finalizeDialogClose}>
        {panelPresent ? (
          <motion.div
            key="atelier-colophon-backdrop"
            data-slot="colophon-backdrop"
            initial={reduced ? false : { opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(6px)" }}
            exit={
              reduced
                ? { opacity: 0 }
                : {
                    opacity: 0,
                    backdropFilter: "blur(0px)",
                    transition: { duration: 0.42, ease: SILK_EASE },
                  }
            }
            transition={
              reduced
                ? { duration: 0 }
                : { duration: 0.56, ease: SILK_EASE }
            }
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                dismiss();
              }
            }}
            className="flex h-full w-full items-end justify-center overflow-hidden bg-[#140e0b]/70 p-4 sm:items-center sm:p-8"
          >
            <motion.div
              data-slot="colophon-panel"
              initial={reduced ? false : { opacity: 0, y: 34, scale: 0.975 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                reduced
                  ? { opacity: 0 }
                  : {
                      opacity: 0,
                      y: 22,
                      scale: 0.985,
                      transition: { duration: 0.42, ease: SILK_EASE },
                    }
              }
              transition={
                reduced
                  ? { duration: 0 }
                  : { duration: 0.64, ease: SILK_EASE }
              }
              className="surface-cotton-rag max-h-[88dvh] w-full max-w-[680px] overflow-y-auto overscroll-contain border border-[#211813]/18 p-6 sm:p-10"
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#211813]/14 pb-5">
                <div>
                  <p className="font-utility text-[14px] uppercase tracking-[0.14em] text-[var(--accent-monarch-deep)]">
                    {COLOPHON_CONTENT.subtitle}
                  </p>
                  <h2
                    id="atelier-colophon-heading"
                    className="mt-1 font-display-didone text-[clamp(2.2rem,4.5vw,3.1rem)] leading-[0.94] text-[var(--ink-espresso)]"
                  >
                    {COLOPHON_CONTENT.title}
                  </h2>
                </div>

                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={dismiss}
                  className="editorial-btn-sheen inline-flex min-h-11 shrink-0 items-center justify-center border border-[#211813]/28 px-4 font-utility text-[14px] font-medium text-[var(--ink-espresso)] transition-all duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-[var(--ink-espresso)] hover:text-[var(--surface-rag)]"
                >
                  {COLOPHON_CONTENT.closeLabel}
                </button>
              </div>

              <dl className="mt-6 space-y-6">
                {COLOPHON_CONTENT.notes.map((note, idx) => (
                  <motion.div
                    key={note.heading}
                    initial={reduced ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={
                      reduced
                        ? { duration: 0 }
                        : {
                            duration: 0.44,
                            delay: 0.14 + idx * 0.05,
                            ease: [0.22, 1, 0.36, 1],
                          }
                    }
                    className="border-b border-[#211813]/10 pb-5 last:border-b-0 last:pb-0"
                  >
                    <dt className="font-utility text-[14px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-monarch-deep)]">
                      {note.heading}
                    </dt>
                    <dd className="mt-2 font-editorial-serif text-[18px] leading-[1.6] text-[var(--ink-body-dark)]">
                      {note.body}
                    </dd>
                  </motion.div>
                ))}
              </dl>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </dialog>
  );
}
