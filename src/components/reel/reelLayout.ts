/**
 * Shared geometry for the build reel, in CSS px. The container width drives
 * everything: the sheet, its plate-marked clip, the label, and the height the
 * container reserves. Kept free of three.js so layout and the DOM fallback can
 * size the reel without loading the renderer.
 */
export const REEL_GEOMETRY = {
  rollerRadius: 5,
  /** Rod overhang (2 px) plus a turned finial (14.85 px) on each side. */
  rollerOverhang: 17,
  margin: 20,
  ruleGap: 15,
  captionHeight: 28,
  footer: 14,
  /** Canvas bleed for finials, folds and the cast shadow. */
  bleed: { x: 34, top: 30, bottom: 46 },
} as const;

export interface ReelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ReelLayout {
  width: number;
  height: number;
  paperWidth: number;
  paperHeight: number;
  plate: ReelRect;
  ruleY: number;
  caption: ReelRect;
}

export function reelLayout(measuredWidth: number): ReelLayout {
  const g = REEL_GEOMETRY;
  // Whole CSS pixels throughout, so the canvas buffer maps 1:1 and is never resampled
  const width = Math.round(measuredWidth);
  const paperWidth = Math.max(160, width - g.rollerOverhang * 2);
  const plateW = paperWidth - g.margin * 2;
  const plate = { x: g.margin, y: g.margin, w: plateW, h: plateW * 0.625 };
  const ruleY = plate.y + plate.h + g.ruleGap;
  const caption = { x: plate.x, y: ruleY + 3, w: plateW, h: g.captionHeight };
  const paperHeight = caption.y + caption.h + g.footer;
  return {
    width,
    height: Math.ceil(paperHeight + g.rollerRadius * 2),
    paperWidth,
    paperHeight,
    plate,
    ruleY,
    caption,
  };
}

/** Remaining time, counted down and rounded up so the label never reads 0:00 mid-play. */
export function formatCountdown(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds - 0.05));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
