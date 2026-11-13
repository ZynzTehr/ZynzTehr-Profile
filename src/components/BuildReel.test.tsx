import type { ReactNode } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./canvasui/Cloth", () => ({
  supportsHtmlInCanvas: () => true,
  Cloth: ({ children }: { children: ReactNode }) => <div data-testid="cloth">{children}</div>,
}));

import { BuildReel } from "./BuildReel";

const reel = { video: "/media/builds/demo/reel-0000000000.mp4", poster: "/media/builds/demo/reel-0000000000.webp" };

describe("BuildReel cloth layer", () => {
  const original = globalThis.CanvasRenderingContext2D;

  beforeEach(() => {
    class FakeContext {
      drawElementImage() {}
    }
    Object.defineProperty(globalThis, "CanvasRenderingContext2D", { value: FakeContext, configurable: true, writable: true });
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(globalThis, "CanvasRenderingContext2D", { value: original, configurable: true, writable: true });
  });

  it("drapes the paper and clip in the cloth where live HTML capture exists", () => {
    const { getByTestId } = render(
      <BuildReel reel={reel} title="Demo" open placement="overlay" reduced={false} />,
    );
    const cloth = getByTestId("cloth");
    expect(cloth.querySelector(".build-reel__paper video")).not.toBeNull();
  });

  it("keeps the flat still sheet under reduced motion", () => {
    const { container, queryByTestId } = render(
      <BuildReel reel={reel} title="Demo" open placement="overlay" reduced />,
    );
    expect(queryByTestId("cloth")).toBeNull();
    expect(container.querySelector(".build-reel__paper img")).not.toBeNull();
    expect(container.querySelector("video")).toBeNull();
  });

  it("keeps the flat sheet where the browser cannot capture HTML", () => {
    Object.defineProperty(globalThis, "CanvasRenderingContext2D", { value: class {}, configurable: true, writable: true });
    const { container, queryByTestId } = render(
      <BuildReel reel={reel} title="Demo" open placement="overlay" reduced={false} />,
    );
    expect(queryByTestId("cloth")).toBeNull();
    expect(container.querySelector(".build-reel__paper video")).not.toBeNull();
  });
});
