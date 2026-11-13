import { describe, expect, it } from "vitest";
import { formatCountdown, REEL_GEOMETRY, reelLayout } from "./reelLayout";

describe("build reel layout and label", () => {
  it("counts the label down to the end of the clip without reading 0:00 mid-play", () => {
    expect(formatCountdown(4)).toBe("0:04");
    expect(formatCountdown(3.4)).toBe("0:04");
    expect(formatCountdown(3.01)).toBe("0:03");
    expect(formatCountdown(0.3)).toBe("0:01");
    expect(formatCountdown(0)).toBe("0:00");
    expect(formatCountdown(72.2)).toBe("1:13");
  });

  it("derives a 16:10 plate, rule, label and whole-pixel height from the container width", () => {
    const layout = reelLayout(424.4);
    const g = REEL_GEOMETRY;
    expect(layout.width).toBe(424);
    expect(layout.paperWidth).toBe(424 - g.rollerOverhang * 2);
    expect(layout.plate.w / layout.plate.h).toBeCloseTo(1.6, 5);
    expect(layout.plate.x).toBe(g.margin);
    expect(layout.ruleY).toBeGreaterThan(layout.plate.y + layout.plate.h);
    expect(layout.caption.y).toBeGreaterThan(layout.ruleY);
    expect(layout.caption.y + layout.caption.h).toBeLessThan(layout.paperHeight);
    expect(Number.isInteger(layout.height)).toBe(true);
    expect(layout.height).toBeGreaterThanOrEqual(layout.paperHeight + g.rollerRadius * 2);
  });
});
