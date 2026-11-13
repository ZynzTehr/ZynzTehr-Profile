import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import type { StackReel } from "../data/profileContent";

export type ReelPointerMode = "hover" | "tap";
export type ReelPlacement = "overlay" | "inline";
export type ReelAlign = "start" | "center" | "end";

const HOVER_QUERY = "(hover: hover) and (pointer: fine)";

function readPointerMode(): ReelPointerMode {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "tap";
  return window.matchMedia(HOVER_QUERY).matches ? "hover" : "tap";
}

/** Desktop pointers preview reels on hover/focus; touch and pen get an explicit toggle. */
export function useReelPointerMode(): ReelPointerMode {
  const [mode, setMode] = useState<ReelPointerMode>(readPointerMode);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(HOVER_QUERY);
    const sync = () => setMode(mq.matches ? "hover" : "tap");
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);
  return mode;
}

function prefersSavedData(): boolean {
  if (typeof navigator === "undefined") return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return Boolean(connection?.saveData);
}

function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

const UNFURL_SPRING = { type: "spring", stiffness: 260, damping: 30, mass: 0.9 } as const;
const FURL_TWEEN = { duration: 0.24, ease: [0.55, 0, 0.75, 0.2] } as const;

const containerVariants: Variants = {
  open: { opacity: 1 },
  closed: { opacity: 1, transition: { when: "afterChildren" } },
};

const rollerVariants: Variants = {
  open: { opacity: 1, scaleX: 1, transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] } },
  closed: { opacity: 0, scaleX: 0.72, transition: { duration: 0.16, delay: 0.12 } },
};

const sheetVariants: Variants = {
  open: { y: "0%", transition: { ...UNFURL_SPRING, delay: 0.05 } },
  closed: { y: "101%", transition: FURL_TWEEN },
};

const reducedVariants: Variants = {
  open: { opacity: 1, transition: { duration: 0.12 } },
  closed: { opacity: 0, transition: { duration: 0.12 } },
};

const inlineVariants: Variants = {
  open: { height: "auto", transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] } },
  closed: { height: 0, transition: { duration: 0.24, ease: [0.55, 0, 0.75, 0.2], when: "afterChildren" } },
};

interface ReelSheetProps {
  reel: StackReel;
  title: string;
  stillOnly: boolean;
  variants: Variants;
}

function ReelSheet({ reel, title, stillOnly, variants }: ReelSheetProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const threadRef = useRef<HTMLSpanElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);

  // Drive the terracotta thread from playback time with a transform-only rAF loop.
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      const video = videoRef.current;
      const thread = threadRef.current;
      if (video && thread && video.duration > 0) {
        thread.style.transform = `scaleX(${Math.min(1, video.currentTime / video.duration)})`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  return (
    <motion.div variants={variants} className="build-reel__sheet">
      <div className="build-reel__roller" />
      <div className="build-reel__paper">
        <div className="build-reel__frame">
          <img
            src={reel.poster}
            alt=""
            width={960}
            height={600}
            decoding="async"
            className="build-reel__still"
          />
          {stillOnly ? null : (
            <video
              ref={(el) => {
                videoRef.current = el;
                // React does not always reflect `muted` as an attribute; set the property before autoplay.
                if (el) el.muted = true;
              }}
              data-slot="build-reel-video"
              src={reel.video}
              poster={reel.poster}
              muted
              playsInline
              loop
              autoPlay
              preload="auto"
              tabIndex={-1}
              onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
              onPlaying={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              className={`build-reel__video ${playing ? "is-playing" : ""}`}
            />
          )}
        </div>
        <div className="build-reel__meta font-utility">
          <span className="build-reel__title">{title}</span>
          <span className="build-reel__clock">
            {stillOnly ? "Still" : duration ? formatClock(duration) : "Reel"}
          </span>
        </div>
        {stillOnly ? null : (
          <div className="build-reel__thread">
            <span ref={threadRef} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export interface BuildReelProps {
  reel: StackReel;
  title: string;
  open: boolean;
  placement: ReelPlacement;
  align?: ReelAlign;
  reduced: boolean;
}

/**
 * A cotton-rag reel that unfurls upward out of a brass roller resting on the
 * card's top edge and plays the build's mirrored portfolio clip. Decorative only:
 * every fact it shows is already in the card, so it stays out of the a11y tree.
 */
export function BuildReel({ reel, title, open, placement, align = "start", reduced }: BuildReelProps) {
  const stillOnly = reduced || prefersSavedData();
  const sheetMotion = reduced ? reducedVariants : sheetVariants;

  return (
    <AnimatePresence initial={false}>
      {open ? (
        placement === "overlay" ? (
          <motion.div
            key="reel"
            data-slot="build-reel"
            data-placement="overlay"
            data-align={align}
            aria-hidden="true"
            className="build-reel build-reel--overlay"
            variants={containerVariants}
            initial="closed"
            animate="open"
            exit="closed"
          >
            <div className="build-reel__window">
              <ReelSheet reel={reel} title={title} stillOnly={stillOnly} variants={sheetMotion} />
            </div>
            <motion.div
              className="build-reel__roller build-reel__roller--base"
              variants={reduced ? reducedVariants : rollerVariants}
            />
          </motion.div>
        ) : (
          <motion.div
            key="reel"
            data-slot="build-reel"
            data-placement="inline"
            aria-hidden="true"
            className="build-reel build-reel--inline"
            variants={reduced ? reducedVariants : inlineVariants}
            initial="closed"
            animate="open"
            exit="closed"
          >
            <div className="build-reel__window">
              <ReelSheet reel={reel} title={title} stillOnly={stillOnly} variants={sheetMotion} />
            </div>
            <div className="build-reel__roller build-reel__roller--base" />
          </motion.div>
        )
      ) : null}
    </AnimatePresence>
  );
}
