import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, AnimatePresence, usePresence } from "motion/react";
import type { StackReel } from "../data/profileContent";
import { markMutedInline } from "../lib/scrollEngine";
import { formatCountdown, REEL_GEOMETRY, reelLayout } from "./reel/reelLayout";
import type { ReelScene } from "./reel/ReelScene";

export type ReelPointerMode = "hover" | "tap";
/** `hang`: one scroll hung centred from the top of the chapter. `inline`: inside the card (compact layouts). */
export type ReelPlacement = "hang" | "inline";

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

/** The rendered scroll needs WebGL2; everything else gets the flat print. */
function canRenderScene(): boolean {
  return typeof window !== "undefined" && "WebGL2RenderingContext" in window;
}

/** Fetch and parse the renderer ahead of the first unfurl (call when builds become visible). */
export function preloadReelScene(): void {
  if (canRenderScene()) void import("./reel/ReelScene").catch(() => {});
}

interface ReelStageProps {
  projectId: string;
  reel: StackReel;
  title: string;
  placement: ReelPlacement;
  reduced: boolean;
}

function ReelStage({ projectId, reel, title, placement, reduced }: ReelStageProps) {
  const [isPresent, safeToRemove] = usePresence();
  const boxRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sceneRef = useRef<ReelScene | null>(null);
  const [mode, setMode] = useState<"scene" | "print">(() => (canRenderScene() ? "scene" : "print"));
  const [width, setWidth] = useState(400);
  const [remaining, setRemaining] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const stillOnly = reduced || prefersSavedData();
  const layout = reelLayout(width);

  // Reserve the exact height for the measured width before first paint
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (box && box.clientWidth > 0) setWidth(box.clientWidth);
  }, []);

  // Rendered scroll: load three.js lazily, unfurl, and follow the container's width
  useEffect(() => {
    if (mode !== "scene") return;
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;
    let cancelled = false;
    let observer: ResizeObserver | null = null;

    import("./reel/ReelScene")
      .then(({ ReelScene }) => {
        if (cancelled) return;
        const scene = new ReelScene({
          canvas,
          pointerTarget: box,
          video: stillOnly ? null : videoRef.current,
          poster: reel.poster,
          title,
          reduced: stillOnly,
          onFrameError: () => setMode("print"),
        });
        sceneRef.current = scene;
        scene.setSize(box.clientWidth || 400);
        void scene.prepare().then(() => {
          if (!cancelled) void scene.open();
        });
        if (typeof ResizeObserver !== "undefined") {
          observer = new ResizeObserver(() => {
            const next = box.clientWidth;
            if (next <= 0) return;
            setWidth(next);
            scene.setSize(next);
          });
          observer.observe(box);
        }
      })
      .catch(() => {
        if (!cancelled) setMode("print");
      });

    const onLost = (event: Event) => {
      event.preventDefault();
      setMode("print");
    };
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      cancelled = true;
      observer?.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [mode, reel.poster, stillOnly, title]);

  // Furl before leaving: roll the sheet back onto the base roller, then collapse inline space
  useEffect(() => {
    if (isPresent) return;
    let cancelled = false;
    const finish = () => {
      if (cancelled) return;
      const box = boxRef.current;
      if (placement === "inline" && box && !reduced) {
        void animate(box, { height: 0 }, { duration: 0.26, ease: [0.55, 0, 0.75, 0.2] }).then(() => safeToRemove?.());
      } else {
        safeToRemove?.();
      }
    };
    const scene = sceneRef.current;
    if (scene) void scene.close().then(finish);
    else window.setTimeout(finish, reduced ? 0 : 180);
    return () => {
      cancelled = true;
    };
  }, [isPresent, placement, reduced, safeToRemove]);

  const { bleed, rollerOverhang, rollerRadius } = REEL_GEOMETRY;

  return (
    <div
      ref={boxRef}
      data-slot="build-reel"
      data-placement={placement}
      data-project={projectId}
      data-state={isPresent ? "open" : "closing"}
      data-render={mode}
      aria-hidden="true"
      className={`build-reel build-reel--${placement}`}
      style={{ height: layout.height }}
    >
      {placement === "hang" ? (
        // Silk hanging cord from the top roller to a brass picture pin
        <svg
          className="build-reel__cord"
          width={layout.width}
          height={HANG_CORD}
          viewBox={`0 0 ${layout.width} ${HANG_CORD}`}
        >
          <defs>
            <radialGradient id={`reel-pin-${projectId}`} cx="38%" cy="32%" r="70%">
              <stop offset="0" stopColor="#f4e3b8" />
              <stop offset="0.45" stopColor="#b48a4c" />
              <stop offset="1" stopColor="#5a4220" />
            </radialGradient>
          </defs>
          <path
            d={`M ${layout.width * 0.22} ${HANG_CORD} L ${layout.width / 2} ${PIN_Y} L ${layout.width * 0.78} ${HANG_CORD}`}
            fill="none"
          />
          <circle className="build-reel__pin-shadow" cx={layout.width / 2 + 1.2} cy={PIN_Y + 2} r={4.6} />
          <circle cx={layout.width / 2} cy={PIN_Y} r={4.4} fill={`url(#reel-pin-${projectId})`} />
          <circle cx={layout.width / 2} cy={PIN_Y} r={1.3} fill="#3e2d15" opacity={0.55} />
        </svg>
      ) : null}
      {stillOnly ? null : (
        <video
          ref={(el) => {
            videoRef.current = el;
            // React only sets the `muted` property; iOS autoplay also needs the attribute
            markMutedInline(el);
          }}
          data-slot="build-reel-video"
          className="build-reel__video"
          src={reel.video}
          poster={reel.poster}
          muted
          playsInline
          loop
          autoPlay
          preload="auto"
          tabIndex={-1}
          onTimeUpdate={(event) => {
            const video = event.currentTarget;
            if (mode !== "print" || !(video.duration > 0)) return;
            setRemaining(formatCountdown(video.duration - video.currentTime));
            setProgress(video.currentTime / video.duration);
          }}
          style={{
            left: layout.plate.x + rollerOverhang,
            top: layout.plate.y + rollerRadius,
            width: layout.plate.w,
            height: layout.plate.h,
            // In the rendered scroll the clip is a texture; keep the element decoding but unseen
            opacity: mode === "scene" ? 0 : 1,
          }}
        />
      )}

      {mode === "scene" ? (
        <canvas
          ref={canvasRef}
          className="build-reel__canvas"
          style={{
            left: -bleed.x,
            top: -bleed.top,
            width: layout.width + bleed.x * 2,
            height: layout.height + bleed.top + bleed.bottom,
          }}
        />
      ) : (
        <div className="build-reel__print">
          <div className="build-reel__rod" />
          <div className="build-reel__sheet" style={{ height: layout.paperHeight - rollerRadius * 2 }}>
            <img
              className="build-reel__plate"
              src={reel.poster}
              alt=""
              width={960}
              height={600}
              decoding="async"
              style={{ left: layout.plate.x, top: layout.plate.y - rollerRadius, width: layout.plate.w, height: layout.plate.h }}
            />
            <div className="build-reel__rule" style={{ left: layout.plate.x, right: layout.plate.x, top: layout.ruleY - rollerRadius }}>
              <span style={{ transform: `scaleX(${stillOnly ? 0 : progress})` }} />
            </div>
            <div
              className="build-reel__label"
              style={{ left: layout.caption.x, right: layout.caption.x, top: layout.caption.y - rollerRadius, height: layout.caption.h }}
            >
              <span className="build-reel__title">{title}</span>
              <span className="build-reel__clock">{stillOnly ? "Still" : (remaining ?? "Reel")}</span>
            </div>
          </div>
          <div className="build-reel__rod" />
        </div>
      )}
    </div>
  );
}

/** Cord drop from the brass pin to the top roller (the CSS hang offset keeps the pin in frame). */
const HANG_CORD = 76;
const PIN_Y = 6;

export interface BuildReelProps {
  /** Distinct per build so switching builds furls the old scroll before the next one drops. */
  projectId: string;
  reel: StackReel;
  title: string;
  open: boolean;
  placement: ReelPlacement;
  reduced: boolean;
}

/**
 * A hanging cotton-rag scroll that unrolls downward from its top roller and
 * plays the build's mirrored portfolio clip, printed inside a plate mark with a
 * typeset label and countdown. Decorative only: every fact it shows is already
 * in the card, so it stays out of the accessibility tree.
 */
export function BuildReel({ projectId, reel, title, open, placement, reduced }: BuildReelProps) {
  return (
    <AnimatePresence initial={false} mode="wait">
      {open ? (
        <ReelStage key={projectId} projectId={projectId} reel={reel} title={title} placement={placement} reduced={reduced} />
      ) : null}
    </AnimatePresence>
  );
}
