import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler, { isAllowedStreakUser } from "./streak.js";

function createMockRes() {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let body = "";
  return {
    headers,
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value;
    },
    status(code: number) {
      statusCode = code;
      return {
        send(payload: string) {
          body = payload;
          return payload;
        },
      };
    },
  };
}

describe("api/streak owner lock and cache safety", () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.PAT_1;
    delete process.env.GITHUB_TOKEN;
    delete process.env.TOKEN;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("allows only undefined or case-insensitive ZynzTehr", () => {
    expect(isAllowedStreakUser(undefined)).toBe(true);
    expect(isAllowedStreakUser("ZynzTehr")).toBe(true);
    expect(isAllowedStreakUser("zynztehr")).toBe(true);
    expect(isAllowedStreakUser("")).toBe(false);
    expect(isAllowedStreakUser("torvalds")).toBe(false);
    expect(isAllowedStreakUser(["ZynzTehr"])).toBe(false);
    expect(isAllowedStreakUser("<script>alert(1)</script>")).toBe(false);
  });

  it("returns HTTP 200 SVG with CSP headers when calendar HTML succeeds for ZynzTehr", async () => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const calendarHtml = `
      <div>412 contributions in the last year</div>
      <td data-date="${yesterday}"></td><tool-tip>5 contributions</tool-tip>
      <td data-date="${today}"></td><tool-tip>3 contributions</tool-tip>
    `;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => calendarHtml,
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const res = createMockRes();
    await handler({ query: { user: "ZynzTehr" } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("image/svg+xml");
    expect(res.headers["content-security-policy"]).toContain("sandbox");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.body).toContain("412");
    expect(res.body).toContain("2 <tspan");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects non-owner, array, empty, and XSS queries with HTTP 400 and zero upstream fetches", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    for (const badUser of ["torvalds", "<svg/onload=alert(1)>", "", ["ZynzTehr", "other"], "../../etc"]) {
      const res = createMockRes();
      await handler({ query: { user: badUser as string | string[] } }, res);
      expect(res.statusCode).toBe(400);
      expect(res.headers["cache-control"]).toBe("no-store");
      expect(res.headers["content-security-policy"]).toContain("default-src 'none'");
      expect(res.body).toContain("Streak badge restricted to ZynzTehr");
      expect(res.body).not.toContain("onload");
      expect(res.body).not.toContain("torvalds");
    }

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to short 60s cache instead of 28-hour zero-streak cache on HTTP 429 or empty HTML", async () => {
    const fetch429 = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => "Too Many Requests",
    });
    globalThis.fetch = fetch429 as unknown as typeof fetch;

    const res429 = createMockRes();
    await handler({ query: {} }, res429);
    expect(res429.statusCode).toBe(200);
    expect(res429.headers["cache-control"]).toBe("public, max-age=60, s-maxage=60");
    expect(res429.body).toContain("ZynzTehr's GitHub Streak");

    const fetchEmpty200 = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "<html><body>Rate limited interstitial without calendar cells</body></html>",
    });
    globalThis.fetch = fetchEmpty200 as unknown as typeof fetch;

    const resEmpty = createMockRes();
    await handler({ query: { user: "ZynzTehr" } }, resEmpty);
    expect(resEmpty.statusCode).toBe(200);
    expect(resEmpty.headers["cache-control"]).toBe("public, max-age=60, s-maxage=60");
    expect(resEmpty.body).toContain("Contributions Syncing...");

    const fetchTimeout = vi
      .fn()
      .mockRejectedValue(new DOMException("The operation was aborted due to timeout", "TimeoutError"));
    globalThis.fetch = fetchTimeout as unknown as typeof fetch;

    const resTimeout = createMockRes();
    await handler({ query: { user: "ZynzTehr" } }, resTimeout);
    expect(resTimeout.statusCode).toBe(200);
    expect(resTimeout.headers["cache-control"]).toBe("public, max-age=60, s-maxage=60");
    expect(resTimeout.body).toContain("Contributions Syncing...");
  });
});
