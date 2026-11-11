import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();

  class MockWebGLRenderer {
    domElement: HTMLCanvasElement;
    constructor(params?: { canvas?: HTMLCanvasElement }) {
      this.domElement = params?.canvas ?? document.createElement("canvas");
    }
    getContext() {
      return {} as WebGLRenderingContext;
    }
    setPixelRatio() {}
    setSize() {}
    render() {}
    dispose() {}
  }

  return {
    ...actual,
    WebGLRenderer: MockWebGLRenderer,
  };
});

import { App } from "../App";
import { navigateToAnchor } from "../lib/scrollEngine";
import { Act04Portfolio } from "./Act04Portfolio";
import { Act05Connect } from "./Act05Connect";
import {
  CONNECT_CONTENT,
  CONTACT_EMAIL,
  GITHUB_REPOS_URL,
  PORTFOLIO_URL,
} from "../data/profileContent";

const originalMatchMedia = window.matchMedia;
const originalClipboard = navigator.clipboard;

function stripPermittedEmail(input: string): string {
  return input.replaceAll(CONTACT_EMAIL, "");
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.matchMedia = originalMatchMedia;
  Object.defineProperty(navigator, "clipboard", {
    value: originalClipboard,
    configurable: true,
    writable: true,
  });
});

describe("Phase 3 Ticket 07: Act04Portfolio, Act05Connect, and ColophonSheet", () => {
  it("renders Act04Portfolio external links, plays porch video once on view entry, and re-triggers on hover without restarting mid-playback", () => {
    const OriginalIO = globalThis.IntersectionObserver;
    let ioCallback: IntersectionObserverCallback | null = null;

    class MockIO {
      constructor(cb: IntersectionObserverCallback) {
        ioCallback = cb;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    globalThis.IntersectionObserver = MockIO as unknown as typeof IntersectionObserver;

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(min-width: 768px)",
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));

    const playSpy = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockImplementation(() => Promise.resolve());

    try {
      const { container: cNoVideo, unmount: uNoVideo } = render(
        <Act04Portfolio hasPortfolioVideo={false} />,
      );
      expect(cNoVideo.querySelector("video")).toBeNull();

      const portfolioLinks = Array.from(cNoVideo.querySelectorAll(`a[href="${PORTFOLIO_URL}"]`));
      expect(portfolioLinks.length).toBeGreaterThanOrEqual(2);
      for (const link of portfolioLinks) {
        expect(link.getAttribute("target")).toBe("_blank");
        expect(link.getAttribute("rel")).toContain("noopener");
        expect(link.getAttribute("rel")).toContain("noreferrer");
      }

      const repoLink = cNoVideo.querySelector(`a[href="${GITHUB_REPOS_URL}"]`);
      expect(repoLink).not.toBeNull();
      expect(repoLink?.getAttribute("target")).toBe("_blank");
      expect(repoLink?.getAttribute("rel")).toContain("noopener");
      expect(stripPermittedEmail(cNoVideo.textContent ?? "")).not.toMatch(/jorge|bucio/i);
      uNoVideo();

      const { container: cWithVideo, unmount: uWithVideo } = render(
        <Act04Portfolio hasPortfolioVideo={true} />,
      );
      const videoEl = cWithVideo.querySelector(
        'video[data-slot="portfolio-porch-video"]',
      ) as HTMLVideoElement | null;
      const printFrame = cWithVideo.querySelector(
        '[data-slot="portfolio-print-frame"]',
      ) as HTMLElement | null;

      expect(videoEl).not.toBeNull();
      expect(printFrame).not.toBeNull();
      expect(videoEl?.muted).toBe(true);
      expect(videoEl?.loop).toBe(false);
      expect(videoEl?.autoplay).toBe(false);
      expect(playSpy).not.toHaveBeenCalled();

      // 1. Entering viewport triggers porch video playback ONCE
      act(() => {
        ioCallback?.(
          [{ isIntersecting: true, target: printFrame! } as unknown as IntersectionObserverEntry],
          {} as IntersectionObserver,
        );
      });
      expect(playSpy).toHaveBeenCalledTimes(1);

      // 2. While video is playing (currentTime = 4.2s), hovering in/out MUST NOT restart or interrupt playback
      videoEl!.currentTime = 4.2;
      fireEvent.pointerEnter(printFrame!);
      fireEvent.pointerLeave(printFrame!);
      fireEvent.pointerEnter(printFrame!);
      expect(playSpy).toHaveBeenCalledTimes(1);
      expect(videoEl!.currentTime).toBeCloseTo(4.2, 2);

      // 3. Re-intersecting after completion does NOT auto-loop; only hover re-triggers from 0
      fireEvent.ended(videoEl!);
      act(() => {
        ioCallback?.(
          [{ isIntersecting: true, target: printFrame! } as unknown as IntersectionObserverEntry],
          {} as IntersectionObserver,
        );
      });
      expect(playSpy).toHaveBeenCalledTimes(1);

      fireEvent.pointerEnter(printFrame!);
      expect(playSpy).toHaveBeenCalledTimes(2);
      expect(videoEl!.currentTime).toBe(0);

      // 4. External browser pause (e.g. background tab throttling) resets playing guard; media error hides video
      fireEvent.pause(videoEl!);
      fireEvent.pointerEnter(printFrame!);
      expect(playSpy).toHaveBeenCalledTimes(3);

      fireEvent.error(videoEl!);
      expect(videoEl!.style.opacity).toBe("0");

      uWithVideo();
    } finally {
      playSpy.mockRestore();
      globalThis.IntersectionObserver = OriginalIO;
    }
  });

  it("E1: copies jorgeforwork88@gmail.com via navigator.clipboard.writeText, announces Copied, and resets after 2500ms", async () => {
    vi.useFakeTimers();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    const { container } = render(
      <Act05Connect colophonOpen={false} onOpenColophon={() => {}} />,
    );

    // Zero forms, inputs, textareas, or README telemetry widgets
    expect(container.querySelector("form, input, textarea")).toBeNull();
    expect(container.querySelector('img[src*="streak"], img[src*="snake"]')).toBeNull();
    expect(stripPermittedEmail(container.textContent ?? "")).not.toMatch(/jorge|bucio/i);

    const copyBtn = screen.getByRole("button", { name: CONNECT_CONTENT.copyLabel });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeTextMock).toHaveBeenCalledWith(CONTACT_EMAIL);
    const statusRegion = screen.getByRole("status");
    expect(statusRegion.textContent).toBe(CONNECT_CONTENT.copiedLabel);

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(statusRegion.textContent).toBe("");
    expect(screen.getByRole("button", { name: CONNECT_CONTENT.copyLabel })).toBeInTheDocument();
  });

  it("E2: catches clipboard rejection cleanly, selects visible email text node, and announces fallback notice", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi
      .fn()
      .mockRejectedValue(new DOMException("Clipboard permission denied", "NotAllowedError"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    render(<Act05Connect colophonOpen={false} onOpenColophon={() => {}} />);

    const copyBtn = screen.getByRole("button", { name: CONNECT_CONTENT.copyLabel });
    await user.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith(CONTACT_EMAIL);
    expect(screen.getByRole("status").textContent).toBe(CONNECT_CONTENT.fallbackNotice);
    expect(window.getSelection()?.toString()).toBe(CONTACT_EMAIL);
  });

  it("E3: opens ColophonSheet native <dialog>, contains zero personal name matches, closes on Escape and backdrop click, restores focus, and hands off cleanly on Cmd+K", async () => {
    const user = userEvent.setup();
    render(<App />);

    const trigger = screen.getByRole("button", { name: CONNECT_CONTENT.colophonTriggerLabel });
    await user.click(trigger);

    const dialog = document.getElementById("atelier-colophon-dialog") as HTMLDialogElement | null;
    expect(dialog).not.toBeNull();
    expect(dialog?.hasAttribute("open")).toBe(true);
    expect(stripPermittedEmail(dialog?.textContent ?? "")).not.toMatch(/jorge|bucio/i);

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(dialog?.hasAttribute("open")).toBe(false);
    });
    expect(document.activeElement).toBe(trigger);

    // Re-open and dismiss via outside backdrop click
    await user.click(trigger);
    expect(dialog?.hasAttribute("open")).toBe(true);

    const backdrop = dialog?.querySelector('[data-slot="colophon-backdrop"]') as HTMLElement | null;
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);

    await waitFor(() => {
      expect(dialog?.hasAttribute("open")).toBe(false);
    });
    expect(document.activeElement).toBe(trigger);

    // Re-open ColophonSheet and switch directly to MenuOverlay via Ctrl+K without focus theft
    await user.click(trigger);
    expect(dialog?.hasAttribute("open")).toBe(true);

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    const menuDialog = document.getElementById("atelier-menu-dialog") as HTMLDialogElement | null;
    await waitFor(() => {
      expect(dialog?.hasAttribute("open")).toBe(false);
      expect(menuDialog?.hasAttribute("open")).toBe(true);
    });
    expect(document.activeElement).not.toBe(trigger);
  });

  it("E4: preserves Hero status on desktop initial IntersectionObserver records, resolves Page 5 <-> Page 6 slide-over state, uncovers occluded sticky links on focus, and retries delayed scrub focus", () => {
    vi.useFakeTimers();
    const OriginalIO = globalThis.IntersectionObserver;
    const observers: Array<{
      cb: IntersectionObserverCallback;
      targets: Element[];
    }> = [];

    class SpecCompliantIO {
      private record: { cb: IntersectionObserverCallback; targets: Element[] };
      constructor(cb: IntersectionObserverCallback) {
        this.record = { cb, targets: [] };
        observers.push(this.record);
      }
      observe(target: Element) {
        this.record.targets.push(target);
      }
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    globalThis.IntersectionObserver = SpecCompliantIO as unknown as typeof IntersectionObserver;

    Object.defineProperty(window, "innerWidth", { value: 1440, configurable: true, writable: true });
    Object.defineProperty(window, "innerHeight", { value: 900, configurable: true, writable: true });
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(min-width: 900px)" || query === "(min-width: 768px)",
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));

    const lenisScrollSpy = vi.fn();

    try {
      const { container } = render(<App />);
      const statusEl = container.querySelector('[data-slot="chapter-status"]');
      expect(statusEl?.textContent).toBe("Menifee, Southern California");

      // Locate App.tsx's chapter observer (observing 04-portfolio and 05-connect)
      const appObserver = observers.find((o) =>
        o.targets.some((t) => t.getAttribute("data-act") === "05-connect"),
      );
      expect(appObserver).toBeDefined();
      const portfolioSection = container.querySelector('[data-act="04-portfolio"]') as HTMLElement;
      const connectSection = container.querySelector('[data-act="05-connect"]') as HTMLElement;

      const makeIoEntry = (
        target: Element,
        isIntersecting: boolean,
        top: number,
      ): IntersectionObserverEntry => {
        const rect: DOMRectReadOnly = {
          top,
          bottom: top + 900,
          left: 0,
          right: 1440,
          width: 1440,
          height: 900,
          x: 0,
          y: top,
          toJSON: () => ({}),
        };
        return {
          target,
          isIntersecting,
          intersectionRatio: isIntersecting ? 1 : 0,
          boundingClientRect: rect,
          intersectionRect: rect,
          rootBounds: rect,
          time: 0,
        };
      };

      // 1. Emit initial non-intersecting records (top > 0) at scrollY = 0: Hero status MUST remain untouched
      act(() => {
        appObserver!.cb(
          [
            makeIoEntry(portfolioSection, false, 6100),
            makeIoEntry(connectSection, false, 7000),
          ],
          {} as IntersectionObserver,
        );
      });
      expect(statusEl?.textContent).toBe("Menifee, Southern California");

      // 2. Scroll into Page 5 -> Page 6 slide-over -> reverse back to Page 5
      act(() => {
        appObserver!.cb([makeIoEntry(portfolioSection, true, 0)], {} as IntersectionObserver);
      });
      expect(statusEl?.textContent).toBe("IV · Live Portfolio Portal");

      act(() => {
        appObserver!.cb([makeIoEntry(connectSection, true, 120)], {} as IntersectionObserver);
      });
      expect(statusEl?.textContent).toBe("V · Let's Connect");

      act(() => {
        appObserver!.cb([makeIoEntry(connectSection, false, 820)], {} as IntersectionObserver);
      });
      expect(statusEl?.textContent).toBe("IV · Live Portfolio Portal");

      // 3. Focusing a Page 5 link while occluded by Page 6 (connect top = 0) scrolls stage wrapper into view
      window.lenis = { scrollTo: lenisScrollSpy } as unknown as typeof window.lenis;
      vi.spyOn(connectSection, "getBoundingClientRect").mockReturnValue({
        top: 0,
        bottom: 900,
        left: 0,
        right: 1440,
        width: 1440,
        height: 900,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });
      const firstPortfolioLink = portfolioSection.querySelector("a") as HTMLAnchorElement;
      fireEvent.focus(firstPortfolioLink);
      expect(lenisScrollSpy).toHaveBeenCalledWith(
        container.querySelector('[data-slot="portfolio-connect-stage"]'),
        expect.objectContaining({ force: true }),
      );

      // 4. Delayed scrub visibility: navigateToAnchor retries focus until target accepts focus
      const stackSection = container.querySelector("#stack") as HTMLElement;
      expect(stackSection).not.toBeNull();
      const origFocus = stackSection.focus.bind(stackSection);
      let allowStackFocus = false;
      const focusMock = vi.spyOn(stackSection, "focus").mockImplementation((opts) => {
        if (allowStackFocus) {
          origFocus(opts);
        }
      });

      window.lenis = null;
      window.scrollTo = vi.fn();
      navigateToAnchor("#stack");
      expect(document.activeElement).not.toBe(stackSection);

      allowStackFocus = true;
      act(() => {
        vi.advanceTimersByTime(220);
      });
      expect(document.activeElement).toBe(stackSection);
      focusMock.mockRestore();
    } finally {
      window.lenis = null;
      globalThis.IntersectionObserver = OriginalIO;
    }
  });
});
