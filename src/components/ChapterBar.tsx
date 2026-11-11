import { useEffect, useState, type RefObject } from "react";
import { motion } from "motion/react";
import {
  CHAPTER_ITEMS,
  HERO_CONTENT,
  PORTFOLIO_URL,
} from "../data/profileContent";
import { navigateToAnchor, prefersReducedMotion } from "../lib/scrollEngine";

export interface ChapterBarProps {
  activeAct: string;
  menuOpen: boolean;
  onOpenMenu: () => void;
  menuTriggerRef: RefObject<HTMLButtonElement | null>;
}

const DARK_ACTS = new Set(["01-journey", "03-stack"]);

export function ChapterBar({
  activeAct,
  menuOpen,
  onOpenMenu,
  menuTriggerRef,
}: ChapterBarProps) {
  const [hidden, setHidden] = useState(false);
  const [focusedWithin, setFocusedWithin] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      setScrolled(y > 24);

      if (y < 56 || menuOpen || focusedWithin) {
        setHidden(false);
      } else if (delta > 8 && y > 110) {
        setHidden(true);
      } else if (delta < -5) {
        setHidden(false);
      }

      lastY = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [focusedWithin, menuOpen]);

  const activeChapter = CHAPTER_ITEMS.find((item) => item.actAttr === activeAct);
  const statusLabel = activeChapter
    ? `${activeChapter.numeral} · ${activeChapter.label}`
    : HERO_CONTENT.locationLabel;

  const isDarkGround = DARK_ACTS.has(activeAct);
  const shouldShow = !hidden || menuOpen || focusedWithin;
  const reduced = prefersReducedMotion();

  const surfaceClasses = isDarkGround
    ? scrolled
      ? "bg-[#251b16]/88 text-[var(--ink-cream)] border-[#f4eee3]/12 shadow-[0_10px_30px_rgba(12,8,6,0.28)] backdrop-blur-md"
      : "bg-[#251b16]/68 text-[var(--ink-cream)] border-transparent backdrop-blur-sm"
    : scrolled
      ? "bg-[#f7f1e6]/88 text-[var(--ink-espresso)] border-[#211813]/10 shadow-[0_10px_28px_rgba(33,24,19,0.08)] backdrop-blur-md"
      : "bg-[#f7f1e6]/64 text-[var(--ink-espresso)] border-transparent backdrop-blur-sm";

  return (
    <motion.header
      data-slot="chapter-bar"
      initial={reduced ? false : { y: -28, opacity: 0 }}
      animate={{ y: shouldShow ? 0 : -80, opacity: 1 }}
      transition={
        reduced
          ? { duration: 0 }
          : { duration: 0.54, ease: [0.22, 1, 0.36, 1] }
      }
      onFocusCapture={() => {
        setFocusedWithin(true);
        setHidden(false);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocusedWithin(false);
        }
      }}
      className={`fixed inset-x-0 top-0 z-40 h-[68px] border-b transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${surfaceClasses}`}
    >
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-8 lg:px-12">
        <a
          href="#hero"
          onClick={(event) => {
            event.preventDefault();
            navigateToAnchor("#hero");
          }}
          className="group inline-flex min-h-11 items-center px-1 font-utility text-[14px] font-medium tracking-[0.04em] sm:text-[15px]"
        >
          <span
            data-slot="chapter-status"
            className="max-w-[235px] truncate transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 sm:max-w-none"
          >
            {statusLabel}
          </span>
        </a>

        <nav
          aria-label="Chapter navigation"
          className="flex items-center gap-1 font-utility text-[14px] sm:gap-2 sm:text-[15px]"
        >
          <div className="mr-2 hidden items-center gap-1 lg:flex">
            {CHAPTER_ITEMS.slice(0, 3).map((item) => {
              const isCurrent = item.actAttr === activeAct;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={(event) => {
                    event.preventDefault();
                    navigateToAnchor(item.href);
                  }}
                  aria-current={isCurrent ? "location" : undefined}
                  className={`editorial-link-line inline-flex min-h-11 items-center px-3 transition-opacity duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isCurrent ? "font-semibold opacity-100" : "opacity-80 hover:opacity-100"
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </div>

          <a
            href={PORTFOLIO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="editorial-link-line group hidden min-h-11 items-center gap-1 px-3 font-medium opacity-90 transition-opacity duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:opacity-100 sm:inline-flex"
          >
            <span>Portfolio</span>
            <span
              aria-hidden="true"
              className="inline-block transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
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
            className="editorial-link-line hidden min-h-11 items-center px-3 font-medium opacity-90 transition-opacity duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:opacity-100 md:inline-flex"
          >
            Connect
          </a>

          <button
            ref={menuTriggerRef}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            aria-controls="atelier-menu-dialog"
            onClick={onOpenMenu}
            className={`editorial-btn-sheen group inline-flex min-h-11 min-w-11 items-center justify-center gap-2.5 border px-3.5 font-medium tracking-[0.04em] transition-all duration-[440ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isDarkGround
                ? "border-[#f4eee3]/28 bg-[#f4eee3]/8 hover:border-[#f4eee3]/50 hover:bg-[#f4eee3]/16"
                : "border-[#211813]/22 bg-[#f7f1e6]/70 hover:border-[#211813]/45 hover:bg-[#f7f1e6]"
            }`}
          >
            <span>Menu</span>
            <span
              aria-hidden="true"
              data-slot="menu-trigger-lines"
              className="flex w-4 flex-col items-end justify-center gap-[3.5px]"
            >
              <span
                data-slot="menu-line-top"
                className="block h-[1.5px] w-4 bg-current transition-[width] duration-[440ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
              />
              <span
                data-slot="menu-line-bottom"
                className="block h-[1.5px] w-[9px] bg-current transition-[width] duration-[440ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-4 group-focus-visible:w-4"
              />
            </span>
          </button>
        </nav>
      </div>
    </motion.header>
  );
}
