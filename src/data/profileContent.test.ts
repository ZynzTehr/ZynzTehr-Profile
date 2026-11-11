import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assembleStackBuilds,
  buildAutoUsageNote,
  detectRepoTools,
  formatRepoTitle,
  normalizeLiveHref,
} from "../../scripts/sync-stack-builds.mjs";
import stackBuildsData from "./stackBuilds.json";
import {
  ALL_STACK_TOOLS,
  CHAPTER_ITEMS,
  COLOPHON_CONTENT,
  CONNECT_CONTENT,
  CONTACT_EMAIL,
  CRAFT_CONTENT,
  CRAFT_DISCIPLINES,
  GITHUB_REPOS_URL,
  GITHUB_URL,
  HERO_CONTENT,
  JOURNEY_CONTENT,
  LINKEDIN_URL,
  MONARCH_IMAGE_ALT,
  PORTFOLIO_CONTENT,
  PORTFOLIO_IMAGE_ALT,
  PORTFOLIO_URL,
  STACK_COLUMNS,
  STACK_CONTENT,
  STACK_PROJECTS,
} from "./profileContent";

const RETIRED_SKILLS = /\b(motoko|icp|jquery|bootstrap|ejs)\b/i;
const PERSONAL_NAME = /\b(jorge|bucio)\b/i;

function collectVisibleStrings(value: unknown, skipKeys: ReadonlySet<string> = new Set()): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectVisibleStrings(entry, skipKeys));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, val]) =>
      skipKeys.has(key) ? [] : collectVisibleStrings(val, skipKeys),
    );
  }
  return [];
}

describe("profileContent invariants", () => {
  it("keeps canonical external and contact constants exact", () => {
    expect(PORTFOLIO_URL).toBe("https://work.jorgebucio.com/");
    expect(GITHUB_URL).toBe("https://github.com/ZynzTehr");
    expect(GITHUB_REPOS_URL).toBe("https://github.com/ZynzTehr?tab=repositories");
    expect(LINKEDIN_URL).toBe("https://www.linkedin.com/in/jorge-bucio-876738393/");
    expect(CONTACT_EMAIL).toBe("jorgeforwork88@gmail.com");
  });

  it("places personal name in HERO_CONTENT and nowhere in Acts 01-05, nav, menu, colophon, or image alts", () => {
    expect(HERO_CONTENT.firstName).toBe("JORGE");
    expect(HERO_CONTENT.lastName).toBe("BUCIO");

    const nonHeroVisible = collectVisibleStrings(
      {
        CHAPTER_ITEMS,
        JOURNEY_CONTENT,
        CRAFT_CONTENT,
        CRAFT_DISCIPLINES,
        STACK_CONTENT,
        STACK_PROJECTS,
        STACK_COLUMNS,
        PORTFOLIO_CONTENT,
        CONNECT_CONTENT,
        COLOPHON_CONTENT,
        MONARCH_IMAGE_ALT,
        PORTFOLIO_IMAGE_ALT,
      },
      new Set(["href"]),
    );

    for (const text of nonHeroVisible) {
      const sanitized = text
        .replaceAll(CONTACT_EMAIL, "")
        .replaceAll("work.jorgebucio.com", "");
      expect(sanitized, `Unexpected name match inside: "${text}"`).not.toMatch(PERSONAL_NAME);
    }
  });

  it("excludes retired 2024 bootcamp skills across all content", () => {
    const everything = collectVisibleStrings({
      HERO_CONTENT,
      JOURNEY_CONTENT,
      CRAFT_DISCIPLINES,
      STACK_CONTENT,
      STACK_PROJECTS,
      STACK_COLUMNS,
      PORTFOLIO_CONTENT,
      CONNECT_CONTENT,
      COLOPHON_CONTENT,
    });
    for (const text of everything) {
      expect(text).not.toMatch(RETIRED_SKILLS);
    }
  });

  it("defines 18 unique 2026 stack tools with valid cross-column pairedIds and shipped builds", () => {
    expect(ALL_STACK_TOOLS).toHaveLength(18);
    const idSet = new Set(ALL_STACK_TOOLS.map((tool) => tool.id));
    expect(idSet.size).toBe(18);

    for (const tool of ALL_STACK_TOOLS) {
      expect(tool.pairedIds.length).toBeGreaterThan(0);
      expect(tool.craftNote.length).toBeGreaterThan(20);
      expect(tool.relatedBuilds.length).toBeGreaterThanOrEqual(1);
      expect(tool.relatedBuilds.length).toBeLessThanOrEqual(3);
      for (const targetId of tool.pairedIds) {
        expect(targetId).not.toBe(tool.id);
        expect(idSet.has(targetId), `Missing paired tool id "${targetId}" on "${tool.id}"`).toBe(true);
      }
      const rawEntries = stackBuildsData.toolBuilds[tool.id];
      expect(tool.relatedBuilds).toHaveLength(rawEntries.length);

      const seenProjects = new Set<string>();
      for (const build of tool.relatedBuilds) {
        expect(seenProjects.has(build.projectId)).toBe(false);
        seenProjects.add(build.projectId);
        const project = STACK_PROJECTS[build.projectId];
        expect(project.title.length).toBeGreaterThan(2);
        expect(project.href).toMatch(/^https:\/\//);
        expect(project.sourceHref).toMatch(/^https:\/\/github\.com\/ZynzTehr\//);
        expect(build.usage.length).toBeGreaterThan(20);
      }
    }
  });

  it("sync-stack-builds detects real manifest tools, sanitizes new repo copy, and surfaces newly shipped builds within the 3-card cap", () => {
    expect(normalizeLiveHref("https://freight-copilot.vercel.app")).toBe(
      "https://freight-copilot.vercel.app/",
    );
    expect(normalizeLiveHref("http://insecure.example.com")).toBeNull();
    expect(normalizeLiveHref("")).toBeNull();

    expect(formatRepoTitle("freight-ai-hud")).toBe("Freight AI HUD");

    const sanitizedUsage = buildAutoUsageNote(
      "Freight Copilot is an offline yard dispatch tool built by Jorge Bucio with Bootstrap — tracks trailers across docks.",
      "Freight Copilot",
      "indexeddb",
    );
    expect(sanitizedUsage).not.toMatch(PERSONAL_NAME);
    expect(sanitizedUsage).not.toMatch(RETIRED_SKILLS);
    expect(sanitizedUsage.length).toBeGreaterThanOrEqual(24);
    expect(sanitizedUsage.length).toBeLessThanOrEqual(90);

    const emptyFallback = buildAutoUsageNote("", "Freight Copilot", "vitest");
    expect(emptyFallback).toBe("Shipped Freight Copilot deployment built and verified with Vitest.");

    const detected = detectRepoTools({
      repoName: "freight-copilot",
      liveHref: "https://freight-copilot.vercel.app/",
      treePaths: [
        "package.json",
        "tsconfig.json",
        ".env.example",
        ".github/workflows/ci.yml",
        "vercel.json",
      ],
      packageManifests: [
        {
          dependencies: {
            next: "^16.4.0",
            react: "^19.2.0",
            "@neondatabase/serverless": "^1.0.0",
            "@anthropic-ai/sdk": "^0.60.0",
            idb: "^8.0.0",
          },
          devDependencies: {
            typescript: "^5.8.0",
            vitest: "^5.1.0",
            "@playwright/test": "^1.52.0",
          },
        },
      ],
      textBlobs: ["DATABASE_URL=\nANTHROPIC_API_KEY=\n"],
    });

    expect(detected).toEqual([
      "typescript",
      "react-19",
      "nextjs",
      "postgresql",
      "indexeddb",
      "claude-api",
      "vitest",
      "playwright",
      "github-actions",
      "vercel",
    ]);

    const assembled = assembleStackBuilds([
      {
        id: "fleet-pulse",
        repoName: "fleet-pulse",
        title: "Fleet Pulse",
        href: "https://fleet-pulse-gilt.vercel.app/",
        sourceHref: "https://github.com/ZynzTehr/fleet-pulse",
        description: "",
        pushedAtMs: 1_000,
        isCurated: true,
        usageByTool: { vitest: "Verifies dual mileage-and-calendar PM math, fuel splits, and backup merges." },
        tools: ["vitest"],
      },
      {
        id: "job-seance",
        repoName: "JobSeance",
        title: "JobSeance",
        href: "https://job-seance.vercel.app/",
        sourceHref: "https://github.com/ZynzTehr/JobSeance",
        description: "",
        pushedAtMs: 2_000,
        isCurated: true,
        usageByTool: { vitest: "Unit tests rubric scoring and parser logic with zero live network calls." },
        tools: ["vitest"],
      },
      {
        id: "torque-line",
        repoName: "torque-line",
        title: "TorqueLine",
        href: "https://torque-line.vercel.app/",
        sourceHref: "https://github.com/ZynzTehr/torque-line",
        description: "",
        pushedAtMs: 3_000,
        isCurated: true,
        usageByTool: { vitest: "Fast contract suites covering diagnostic schemas and fleet state rules." },
        tools: ["vitest"],
      },
      {
        id: "freight-copilot",
        repoName: "freight-copilot",
        title: "Freight Copilot",
        href: "https://freight-copilot.vercel.app/",
        sourceHref: "https://github.com/ZynzTehr/freight-copilot",
        description: "Real-time yard dispatch board with automated dock checks.",
        pushedAtMs: 9_000,
        isCurated: false,
        usageByTool: null,
        tools: ["vitest"],
      },
    ]);

    expect(assembled.toolBuilds.vitest.map((entry) => entry.projectId)).toEqual([
      "freight-copilot",
      "fleet-pulse",
      "job-seance",
    ]);
    expect(assembled.projects["freight-copilot"]?.href).toBe("https://freight-copilot.vercel.app/");
  });

  it("keeps README.md aligned with hero typing SVG, profile views badge, PAISE program, forward vision, discipline-grouped badges, GitHub widgets, and 6 engineering sections without emojis or dead links", () => {
    const readme = fs.readFileSync(path.resolve(import.meta.dirname, "../../README.md"), "utf8");
    expect(readme).toContain("https://readme-typing-svg.demolab.com");
    expect(readme).toContain("https://komarev.com/ghpvc/?username=ZynzTehr&label=PROFILE+VIEWS&color=0A66C2&style=for-the-badge");
    expect(readme).toContain("Fair Chance Futures' PAISE Program");
    expect(readme).toContain("### Forward vision");
    expect(JOURNEY_CONTENT.milestones[1].label).toBe(
      "The Last Mile, Fair Chance Futures & Next Chapter",
    );
    expect(JOURNEY_CONTENT.paragraphs[1]).toContain("Fair Chance Futures' PAISE Program");
    expect(readme).toContain("https://jorgebucio.com/");
    expect(readme).toContain("https://zynztehr.dev/");
    expect(readme).toContain("/api/streak?user=ZynzTehr");
    expect(readme).toContain("github-contribution-grid-snake");
    for (const themeSvg of [
      "profile-3d-contrib/profile-night-rainbow.svg",
      "profile-3d-contrib/profile-night-view.svg",
      "profile-3d-contrib/profile-night-green.svg",
      "profile-3d-contrib/profile-season-animate.svg",
      "profile-3d-contrib/profile-season.svg",
      "profile-3d-contrib/profile-south-season-animate.svg",
      "profile-3d-contrib/profile-south-season.svg",
      "profile-3d-contrib/profile-green-animate.svg",
      "profile-3d-contrib/profile-green.svg",
      "profile-3d-contrib/profile-gitblock.svg",
    ]) {
      expect(readme).toContain(themeSvg);
    }
    expect(readme).toContain(CONTACT_EMAIL);
    expect(readme).toContain(PORTFOLIO_URL);

    for (const discipline of [
      "## Technical repertoire",
      "### Interface and motion",
      "### Systems and data",
      "### Applied AI",
      "### Web3 and blockchain",
      "### Verification and delivery",
    ]) {
      expect(readme).toContain(discipline);
    }

    for (const badgeToken of [
      "badge/TypeScript-",
      "badge/JavaScript-",
      "badge/HTML5-",
      "badge/CSS3-",
      "badge/React_19-",
      "badge/Next.js-",
      "badge/Vue.js-",
      "badge/Tailwind_CSS_v4-",
      "badge/Bootstrap-",
      "badge/jQuery-",
      "badge/EJS-",
      "badge/GSAP-",
      "badge/Motion_(Framer)-",
      "badge/Three.js-",
      "badge/GLSL_Shaders-",
      "badge/Lenis-",
      "badge/Anime.js-",
      "badge/Node.js-",
      "badge/Hono-",
      "badge/Express.js-",
      "badge/Python-",
      "badge/REST_%26_SSE_APIs-",
      "badge/API-Development-",
      "badge/PostgreSQL-",
      "badge/Prisma-",
      "badge/SQLite-",
      "badge/IndexedDB-",
      "badge/MongoDB-",
      "badge/Mongoose-",
      "badge/Passport-",
      "badge/Bcrypt-",
      "badge/Anthropic_Claude_API-",
      "badge/Google_Gemini_Vision-",
      "badge/Structured_Tool_Use-",
      "badge/Workflow_Orchestration-",
      "badge/Web3.js-",
      "badge/Motoko_(ICP)-",
      "badge/Vite-",
      "badge/Vitest-",
      "badge/Testing_Library-",
      "badge/Playwright-",
      "badge/Axe_Core-",
      "badge/Git-",
      "badge/GitHub-",
      "badge/GitHub_Actions-",
      "badge/Vercel-",
    ]) {
      expect(readme).toContain(badgeToken);
    }

    for (const section of [
      "## System Overview",
      "## Subdirectories & System Boundaries",
      "## Interface",
      "## Invariants",
      "## Side Effects",
      "## Verification",
    ]) {
      expect(readme).toContain(section);
    }

    expect(readme).not.toMatch(/outlook\.com/i);
    expect(readme).not.toContain("#skills");
    expect(readme).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
