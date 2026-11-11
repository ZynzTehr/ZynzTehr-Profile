import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { CONTACT_EMAIL, CONNECT_CONTENT } from "../data/profileContent";
import { ensureGsapPlugins, gsap, prefersReducedMotion, SplitText } from "../lib/scrollEngine";

export interface Act05ConnectProps {
  colophonOpen: boolean;
  onOpenColophon: () => void;
  colophonTriggerRef?: RefObject<HTMLButtonElement | null>;
  slideOverStage?: boolean;
}

type CopyState = "idle" | "copied" | "fallback";

export function Act05Connect({
  colophonOpen,
  onOpenColophon,
  colophonTriggerRef,
  slideOverStage = false,
}: Act05ConnectProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const sectionRef = useRef<HTMLElement | null>(null);
  const eyebrowRef = useRef<HTMLParagraphElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const leadRef = useRef<HTMLParagraphElement | null>(null);
  const handNoteRef = useRef<HTMLParagraphElement | null>(null);
  const cardWrapRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  const emailLinkRef = useRef<HTMLAnchorElement | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef<boolean>(false);

  // Animate heading, copy, Direct Contact Card, channel rows, and footer as Page 6 slides up over Page 5 into place
  useLayoutEffect(() => {
    const section = sectionRef.current;
    const cardWrap = cardWrapRef.current;
    if (!section || !cardWrap || prefersReducedMotion()) return;

    const rect = section.getBoundingClientRect();
    if (rect.height === 0) return;

    ensureGsapPlugins();

    const ctx = gsap.context(() => {
      const splitHeading = headingRef.current
        ? SplitText.create(headingRef.current, {
            type: "lines",
            mask: "lines",
            linesClass: "split-line",
            aria: "none",
          })
        : null;

      const channelItems = Array.from(
        section.querySelectorAll<HTMLElement>('[data-slot="connect-channel-item"]'),
      );

      const tl = gsap.timeline({
        defaults: { ease: "power2.out" },
        scrollTrigger: {
          trigger: section,
          start: "top 92%",
          end: "clamp(top 16%)",
          scrub: 0.52,
        },
      });

      if (eyebrowRef.current) {
        tl.fromTo(
          eyebrowRef.current,
          { opacity: 0, y: 26 },
          { opacity: 1, y: 0, duration: 0.42 },
          0,
        );
      }

      if (splitHeading?.lines.length) {
        tl.fromTo(
          splitHeading.lines,
          { yPercent: 115 },
          { yPercent: 0, duration: 0.48, stagger: 0.08, ease: "power3.out" },
          0.06,
        );
      }

      const leftCopy = [leadRef.current, handNoteRef.current].filter(
        (el): el is NonNullable<typeof el> => el !== null,
      );
      if (leftCopy.length > 0) {
        tl.fromTo(
          leftCopy,
          { opacity: 0, y: 28 },
          { opacity: 1, y: 0, duration: 0.46, stagger: 0.1 },
          0.16,
        );
      }

      tl.fromTo(
        cardWrap,
        { opacity: 0, y: 54, scale: 0.975 },
        { opacity: 1, y: 0, scale: 1, duration: 0.58 },
        0.12,
      );

      if (channelItems.length > 0) {
        tl.fromTo(
          channelItems,
          { opacity: 0, x: -18 },
          { opacity: 1, x: 0, duration: 0.38, stagger: 0.08 },
          0.34,
        );
      }

      if (footerRef.current) {
        tl.fromTo(
          footerRef.current,
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.38 },
          0.56,
        );
      }
    }, section);

    return () => {
      ctx.revert();
    };
  }, [slideOverStage]);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      if (resetTimerRef.current !== null) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const selectVisibleEmail = () => {
    const emailEl = emailLinkRef.current;
    if (!emailEl || typeof window === "undefined" || typeof document === "undefined") return;
    try {
      const selection = window.getSelection?.();
      if (!selection) return;
      const range = document.createRange();
      range.selectNodeContents(emailEl);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch {
      // Selection API unavailable; visible mailto link remains directly clickable
    }
  };

  const handleCopyEmail = async () => {
    if (resetTimerRef.current !== null) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      if (unmountedRef.current) return;
      setCopyState("copied");
      resetTimerRef.current = setTimeout(() => {
        if (unmountedRef.current) return;
        setCopyState("idle");
        resetTimerRef.current = null;
      }, 2500);
    } catch {
      if (unmountedRef.current) return;
      selectVisibleEmail();
      setCopyState("fallback");
    }
  };

  const politeAnnouncement =
    copyState === "copied"
      ? CONNECT_CONTENT.copiedLabel
      : copyState === "fallback"
        ? CONNECT_CONTENT.fallbackNotice
        : "";

  return (
    <section
      ref={sectionRef}
      id="connect"
      data-act="05-connect"
      data-slide-over={slideOverStage ? "true" : undefined}
      aria-labelledby="connect-heading"
      className={
        slideOverStage
          ? "material-sand relative z-20 flex min-h-svh flex-col justify-between border-t border-[#211813]/18 px-6 pt-24 pb-10 shadow-[0_-28px_72px_-12px_rgba(24,17,13,0.34)] sm:px-10 lg:px-12 lg:pt-28"
          : "material-sand relative border-t border-[#211813]/12 px-6 pt-24 pb-10 sm:px-10 lg:px-12 lg:pt-32"
      }
    >
      <div className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col justify-between">
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-14">
          {/* Left closing invitation */}
          <div className="space-y-6 lg:col-span-5">
            <p
              ref={eyebrowRef}
              className="font-utility text-[14px] font-medium uppercase tracking-[0.14em] text-[var(--accent-monarch-deep)]"
            >
              {CONNECT_CONTENT.eyebrow}
            </p>

            <h2
              ref={headingRef}
              id="connect-heading"
              className="chapter-display-heading text-[var(--ink-espresso)]"
            >
              {CONNECT_CONTENT.headlinePlain}
              <em className="font-editorial-italic font-normal text-[var(--accent-monarch)]">
                {CONNECT_CONTENT.headlineItalic}
              </em>
            </h2>

            <p
              ref={leadRef}
              className="max-w-[490px] font-editorial-serif text-[clamp(1.125rem,1.35vw,1.3125rem)] leading-[1.64] text-[var(--ink-body-dark)]"
            >
              {CONNECT_CONTENT.lead}
            </p>

            <p
              ref={handNoteRef}
              aria-hidden="true"
              className="pt-1 font-studio-hand text-[24px] text-[var(--ink-muted-dark)]"
            >
              {CONNECT_CONTENT.handNote}
            </p>
          </div>

          {/* Right raised cotton-rag Direct Contact Card (form-free) */}
          <div ref={cardWrapRef} className="lg:col-span-7">
            <div
              data-slot="direct-contact-card"
              className="surface-cotton-rag border border-[#211813]/16 p-6 transition-shadow duration-500 hover:shadow-[0_28px_60px_-22px_rgba(33,24,19,0.3)] sm:p-8 lg:p-10"
            >
              <div className="border-b border-[#211813]/14 pb-6">
                <p className="font-utility text-[14px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-monarch-deep)]">
                  {CONNECT_CONTENT.emailLabel}
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                  <a
                    ref={emailLinkRef}
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="inline-flex min-h-11 items-center font-editorial-serif text-[clamp(1.25rem,2.4vw,1.75rem)] text-[var(--ink-espresso)] underline decoration-[#a64028]/55 underline-offset-4 transition-colors duration-300 hover:text-[var(--accent-monarch-deep)] hover:decoration-[#a64028]"
                  >
                    {CONTACT_EMAIL}
                  </a>

                  <button
                    type="button"
                    onClick={() => void handleCopyEmail()}
                    className="editorial-btn-sheen inline-flex min-h-11 items-center justify-center border border-[#211813]/28 bg-[#efe6d5]/75 px-4 py-2 font-utility text-[14px] font-medium tracking-[0.04em] text-[var(--ink-espresso)] transition-all duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-[var(--ink-espresso)] hover:text-[var(--surface-rag)]"
                  >
                    {copyState === "copied" ? CONNECT_CONTENT.copiedLabel : CONNECT_CONTENT.copyLabel}
                  </button>
                </div>

                <p
                  role="status"
                  aria-live="polite"
                  className="mt-2 min-h-[22px] font-utility text-[14px] text-[var(--accent-monarch-deep)]"
                >
                  {politeAnnouncement}
                </p>
              </div>

              <ul className="mt-4 divide-y divide-[#211813]/12">
                {CONNECT_CONTENT.channels.map((channel) => (
                  <li key={channel.id} data-slot="connect-channel-item">
                    <a
                      href={channel.href}
                      target={channel.external ? "_blank" : undefined}
                      rel={channel.external ? "noopener noreferrer" : undefined}
                      className="group relative flex min-h-14 flex-col items-start gap-1.5 py-3.5 transition-colors duration-[420ms] after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-[1.25px] after:origin-left after:scale-x-0 after:bg-[var(--accent-monarch)] after:transition-transform after:duration-[440ms] after:ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-[var(--accent-monarch-deep)] hover:after:scale-x-100 focus-visible:after:scale-x-100 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-3"
                    >
                      <span className="font-utility text-[14px] uppercase tracking-[0.1em] text-[var(--ink-muted-dark)] transition-colors duration-[420ms] group-hover:text-[var(--accent-monarch-deep)]">
                        {channel.label}
                      </span>
                      <span className="flex w-full items-center justify-between gap-2 font-editorial-serif text-[19px] font-medium text-[var(--ink-espresso)] transition-all duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 group-hover:text-[var(--accent-monarch-deep)] sm:w-auto sm:justify-end">
                        <span>{channel.valueLabel}</span>
                        <span
                          aria-hidden="true"
                          className="font-utility text-[15px] transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        >
                          ↗
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Single-line studio colophon footer bar */}
        <footer
          ref={footerRef}
          className="mt-20 flex flex-wrap items-center justify-between gap-4 border-t border-[#211813]/16 pt-6 font-utility text-[14px] text-[var(--ink-body-dark)]"
        >
          <p>{CONNECT_CONTENT.footerLine}</p>

          <button
            ref={colophonTriggerRef}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={colophonOpen}
            aria-controls="atelier-colophon-dialog"
            onClick={onOpenColophon}
            className="inline-flex min-h-11 items-center gap-2 px-2 font-medium text-[var(--ink-espresso)] underline decoration-[#211813]/35 underline-offset-4 transition-all duration-300 hover:-translate-y-0.5 hover:text-[var(--accent-monarch-deep)] hover:decoration-[#a64028]"
          >
            <span>{CONNECT_CONTENT.colophonTriggerLabel}</span>
          </button>
        </footer>
      </div>
    </section>
  );
}
