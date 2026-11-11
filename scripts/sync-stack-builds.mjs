#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUTPUT_PATH = path.resolve(__dirname, "../src/data/stackBuilds.json");
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_BUILDS_PER_TOOL = 3;

export const STACK_TOOL_LABELS = {
  typescript: "TypeScript",
  "react-19": "React 19",
  nextjs: "Next.js",
  "tailwind-css": "Tailwind CSS",
  threejs: "Three.js & GLSL",
  gsap: "GSAP",
  motion: "Motion",
  nodejs: "Node.js",
  hono: "Hono",
  postgresql: "PostgreSQL",
  prisma: "Prisma",
  indexeddb: "IndexedDB",
  "claude-api": "Claude API",
  "gemini-vision": "Gemini Vision",
  vitest: "Vitest",
  playwright: "Playwright",
  "github-actions": "GitHub Actions",
  vercel: "Vercel",
};

export const STACK_TOOL_IDS = Object.freeze(Object.keys(STACK_TOOL_LABELS));

/**
 * Profile README repository and 2024 bootcamp/classroom exercises excluded from
 * the 2026 capability folio. Any new non-fork repository with an https://
 * homepage URL is eligible automatically unless added here or archived.
 */
export const EXCLUDED_REPOS = new Set([
  "ZynzTehr",
  "2do",
  "MusicPort",
  "NextChapter",
  "advanced-rock-paper-scissors",
  "auralist-web",
  "basic-rock-paper-scissors",
  "capstone-project",
  "countdown-timer",
  "loanCalculator",
  "match-maker",
  "next-chapter-week-one",
  "python-rock-paper-scissors",
  "rock-paper-scissors-spock",
  "school-directory",
  "soda-diner",
  "super-quiz",
  "testimonial-layout",
  "tic-tac-toe",
  "tic-tac-toe-withAi",
  "tlm-website-redesign",
]);

/**
 * Optional editorial metadata for known repositories.
 * Live URLs still come from GitHub's `homepage` field when valid, falling back
 * to `fallbackHref` only if the GitHub `homepage` field is blank.
 */
export const CURATED_REPO_METADATA = {
  "fleet-pulse": {
    id: "fleet-pulse",
    title: "Fleet Pulse",
    fallbackHref: "https://fleet-pulse-gilt.vercel.app/",
    usageByTool: {
      indexeddb: "100% offline client store for tractors, trailers, fuel logs, and PM triggers.",
      "gemini-vision": "Extracts mileage, diesel, DEF, and shop totals from photographed receipts.",
      vitest: "Verifies dual mileage-and-calendar PM math, fuel splits, and backup merges.",
      vercel: "Static offline-capable fleet maintenance deployment with instant edge loads.",
    },
  },
  JobSeance: {
    id: "job-seance",
    title: "JobSeance",
    fallbackHref: "https://job-seance.vercel.app/",
    usageByTool: {
      typescript: "Typed ghost-job scoring rubrics, Prisma models, and Next.js route contracts.",
      "react-19": "Evidence scorecards, recruiter message checks, and application tracking views.",
      nextjs: "App Router verification flows, OAuth sign-in, and employer board checks.",
      "tailwind-css": "Evidence scorecards and scam-risk breakdowns built on Tailwind CSS v4.",
      nodejs: "Server-side job board verification, OAuth callbacks, and scheduled cleanup.",
      postgresql: "Pooled and direct Neon branches storing verified employer board checks.",
      prisma: "Prisma 7 schema migrations and typed queries for applications and scam reports.",
      "claude-api": "Extracts employer and role data from postings under daily USD spend caps.",
      vitest: "Unit tests rubric scoring and parser logic with zero live network calls.",
      playwright: "End-to-end browser verification of posting checks and authenticated flows.",
      "github-actions": "Continuous typecheck, Vitest, and Playwright verification on pull requests.",
      vercel: "Preview and production deployments backed by branched Neon databases.",
    },
  },
  "torque-line": {
    id: "torque-line",
    title: "TorqueLine",
    fallbackHref: "https://torque-line.vercel.app/",
    usageByTool: {
      typescript: "Shared fleet diagnostic schemas validated across server actions and Zod.",
      "react-19": "Interactive fleet equipment dashboards, fault triage, and fuel tracking.",
      nextjs: "Server actions and multi-page fleet workflows for diagnostics, fuel, and records.",
      "tailwind-css": "High-contrast shop-floor fleet tables and diagnostic drawer layouts.",
      motion: "Fluid layout transitions across fleet diagnostic views, drawers, and tables.",
      postgresql: "Serverless Neon persistence for equipment fault logs and maintenance history.",
      "claude-api": "Structured heavy-duty equipment fault triage and maintenance diagnostics.",
      vitest: "Fast contract suites covering diagnostic schemas and fleet state rules.",
      playwright: "Chromium E2E coverage across equipment records, diagnostics, and fuel logs.",
      vercel: "Full-stack Next.js fleet workspace deployed on Vercel with Neon backing.",
    },
  },
  "campfire-of-the-damned": {
    id: "campfire",
    title: "Campfire of the Damned",
    fallbackHref: "https://campfire-of-the-damned-five.vercel.app/",
    usageByTool: {
      typescript: "Shared type contracts across the React client, Hono API, and cost guards.",
      "react-19": "Atmospheric story interface paired with a reactive pure-CSS campfire.",
      "tailwind-css": "Atmospheric dark-surface story layout and responsive control chrome.",
      nodejs: "API service locking system prompts and pre-call database budget gates.",
      hono: "Typed /api service wrapping story generation in three safety guardrails.",
      postgresql: "Neon Postgres advisory locks and atomic row reservations capping AI spend.",
      "gemini-vision": "Hardened Gemini REST adapter guarded by input, output, and cost gates.",
      vitest: "Contract and fixture tests covering Gemini error handling and budget caps.",
      vercel: "Edge rewrites routing frontend assets and /api Hono functions in one project.",
    },
  },
  aniBeam: {
    id: "ani-beam",
    title: "AniBeam",
    fallbackHref: "https://ani-beam.vercel.app/",
    usageByTool: {
      typescript: "Typed AniList GraphQL client, watchlist sync payloads, and Fastify routes.",
      "react-19": "Manga panel discovery, mood-slider gacha pulls, and persistent title cards.",
      "tailwind-css": "Dynamic artwork-sampled color themes and responsive manga panel grids.",
      nodejs: "Node 24 Fastify chat backend with isolated Postgres test runners.",
      postgresql: "Postgres 18 chat persistence verified against per-test throwaway databases.",
      indexeddb: "Async browser persistence remembering saved watchlists across sessions.",
      vercel: "Frontend SPA delivery paired with cross-device QR list beaming.",
    },
  },
  "new-age-chess": {
    id: "new-age-chess",
    title: "New Age Chess",
    fallbackHref: "https://zynztehr.github.io/new-age-chess/",
    usageByTool: {
      typescript: "Typed chess move validation, ELO bot personalities, and ECO opening trees.",
      "react-19": "Real-time threat radar overlays, square-control heatmaps, and AI coaching.",
      threejs: "3D spatial arena paired with tactical square-control overlays and ELO bots.",
      "github-actions": "Automated build and GitHub Pages deployment workflow on main.",
    },
  },
  "ZynzTehr-Portfolio": {
    id: "webgl-portfolio",
    title: "3D WebGL Portfolio",
    fallbackHref: "https://work.jorgebucio.com/",
    usageByTool: {
      typescript: "Typed 3D scene state, HUD controls, and synced repository metadata.",
      "react-19": "Interactive project HUD layered over a real-time WebGL Earth canvas.",
      threejs: "Interactive 3D Earth showcase with custom SVG artwork and orbital camera.",
      gsap: "Velocity-reactive project carousel motion and HUD choreography.",
      nodejs: "Automated GitHub API sync script generating typed project metadata.",
      "github-actions": "Weekly scheduled repository sync and custom-domain Pages deployment.",
    },
  },
  "ZynzTehr-Profile": {
    id: "atelier-folio",
    title: "Atelier Folio",
    fallbackHref: "https://jorgebucio.com/",
    usageByTool: {
      typescript: "Strict content invariants, scroll choreography state, and SVG API types.",
      "react-19": "Six-act interactive folio with accessible dialogs and pairing splines.",
      "tailwind-css": "Stone, limewash, and olive linen material tokens paired with editorial type.",
      threejs: "Orthographic GLSL sunlight caustics and relief shading over the Monarch plate.",
      gsap: "Pinned multi-act card flips, SplitText reveals, and SVG compass strokes.",
      motion: "Interruptible spring physics for discipline tabs, pairing pins, and modal sheets.",
      nodejs: "Owner-locked serverless SVG streak endpoint and repository sync scripts.",
      vitest: "Unit and component suites verifying content invariants and Act 00-05 UI.",
      playwright: "Scroll-midpoint geometry, 390px mobile layout, and zero-Axe violation gates.",
      "github-actions": "Scheduled repository sync, 3D contribution SVGs, and verification gates.",
      vercel: "Custom apex domain, 308 edge redirects, and CSP-hardened SVG functions.",
    },
  },
  "vscode-fx": {
    id: "vscode-fx",
    title: "VSCode FX",
    fallbackHref: "https://marketplace.visualstudio.com/items?itemName=VSCodeFX.vscode-fx",
    usageByTool: {
      typescript: "Typed VS Code extension runtime coordinating ten pure-CSS editor effects.",
      nodejs: "Extension Host lifecycle commands and theme-aware CSS injection pipeline.",
      "github-actions": "Automated VSIX packaging and release verification workflow.",
    },
  },
};

/**
 * Preferred baseline ordering among the initial curated builds so routine commits
 * to existing repositories do not reshuffle cards week to week. Newly shipped
 * repositories (not in CURATED_REPO_METADATA) automatically rank ahead of this
 * baseline by pushedAt recency so fresh deployments surface immediately.
 */
export const BASELINE_TOOL_PRIORITY = {
  typescript: ["job-seance", "torque-line", "vscode-fx", "ani-beam", "atelier-folio"],
  "react-19": ["ani-beam", "new-age-chess", "campfire", "job-seance", "torque-line"],
  nextjs: ["job-seance", "torque-line"],
  "tailwind-css": ["ani-beam", "job-seance", "atelier-folio", "torque-line", "campfire"],
  threejs: ["webgl-portfolio", "atelier-folio", "new-age-chess"],
  gsap: ["atelier-folio", "webgl-portfolio"],
  motion: ["torque-line", "atelier-folio"],
  nodejs: ["ani-beam", "campfire", "webgl-portfolio", "job-seance", "vscode-fx"],
  hono: ["campfire"],
  postgresql: ["campfire", "job-seance", "ani-beam", "torque-line"],
  prisma: ["job-seance"],
  indexeddb: ["fleet-pulse", "ani-beam"],
  "claude-api": ["job-seance", "torque-line"],
  "gemini-vision": ["fleet-pulse", "campfire"],
  vitest: ["fleet-pulse", "job-seance", "torque-line", "campfire", "atelier-folio"],
  playwright: ["job-seance", "torque-line", "atelier-folio"],
  "github-actions": ["webgl-portfolio", "atelier-folio", "job-seance", "new-age-chess", "vscode-fx"],
  vercel: ["campfire", "job-seance", "atelier-folio", "fleet-pulse", "torque-line", "ani-beam"],
};

const RETIRED_SKILL_WORDS = /\b(motoko|icp|jquery|bootstrap|ejs)\b/gi;
const PERSONAL_NAME_WORDS = /\b(jorge|alberto|bucio)\b/gi;
const PICTOGRAPHIC_CHARS = /\p{Extended_Pictographic}/gu;

export function normalizeLiveHref(rawHomepage, fallbackHref = "") {
  const candidate = String(rawHomepage || fallbackHref || "").trim();
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function slugifyProjectId(repoName) {
  const curated = CURATED_REPO_METADATA[repoName];
  if (curated) return curated.id;
  return String(repoName)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function sanitizeVisibleCopy(text) {
  return String(text || "")
    .replace(PICTOGRAPHIC_CHARS, "")
    .replace(PERSONAL_NAME_WORDS, "")
    .replace(RETIRED_SKILL_WORDS, "")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,+/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/^[,.;:\-\s]+|[,;:\-\s]+$/g, "");
}

export function formatRepoTitle(repoName) {
  const curated = CURATED_REPO_METADATA[repoName];
  if (curated) return curated.title;

  const cleaned = sanitizeVisibleCopy(
    String(repoName)
      .replace(/^ZynzTehr[-_]?/i, "")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[-_]+/g, " "),
  );

  if (!cleaned) return "Shipped Build";

  const acronyms = new Set(["ai", "api", "cli", "css", "db", "fx", "gl", "glsl", "hud", "ocr", "sdk", "ui", "ux", "webgl"]);
  return cleaned
    .split(/\s+/)
    .map((word) => {
      const lower = word.toLowerCase();
      if (acronyms.has(lower)) return lower.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export function buildAutoUsageNote(rawDescription, title, toolId) {
  const toolLabel = STACK_TOOL_LABELS[toolId] || toolId;
  const fallback = `Shipped ${title} deployment built and verified with ${toolLabel}.`;

  const cleaned = sanitizeVisibleCopy(rawDescription);
  if (!cleaned) return fallback;

  const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0] || cleaned;
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let concise = firstSentence
    .replace(new RegExp(`^${escapedTitle}\\s+is\\s+(?:an?\\s+)?`, "i"), "")
    .replace(/^(?:an?|the)\s+/i, "")
    .trim();

  if (!concise) return fallback;
  concise = concise.charAt(0).toUpperCase() + concise.slice(1);

  const maxChars = 88;
  if (concise.length > maxChars) {
    const sliced = concise.slice(0, maxChars - 1);
    const lastSpace = sliced.lastIndexOf(" ");
    concise = (lastSpace > 32 ? sliced.slice(0, lastSpace) : sliced).replace(/[,;:\-\s]+$/, "");
  }

  if (!/[.!?]$/.test(concise)) {
    concise = `${concise}.`;
  }

  if (concise.length < 24) {
    return fallback;
  }

  return concise;
}

function parseReactMajor(versionSpec) {
  if (!versionSpec) return null;
  const match = String(versionSpec).match(/(\d{2})/);
  return match ? Number(match[1]) : null;
}

/**
 * Deterministically detects which of the 18 StackToolIds are used in a repository
 * from its file tree, package.json manifests, .env.example, and AI adapter files.
 */
export function detectRepoTools({
  repoName,
  liveHref,
  treePaths,
  packageManifests,
  textBlobs = [],
}) {
  const detected = new Set();
  const normalizedPaths = treePaths.map((entry) => String(entry));
  const depVersions = new Map();
  let hasVscodeEngine = false;

  for (const pkg of packageManifests) {
    if (!pkg || typeof pkg !== "object") continue;
    if (pkg.engines && typeof pkg.engines === "object" && pkg.engines.vscode) {
      hasVscodeEngine = true;
    }
    for (const section of ["dependencies", "devDependencies", "peerDependencies"]) {
      const record = pkg[section];
      if (!record || typeof record !== "object") continue;
      for (const [depName, version] of Object.entries(record)) {
        if (!depVersions.has(depName)) {
          depVersions.set(depName, String(version));
        }
      }
    }
  }

  const hasDep = (name) => depVersions.has(name);
  const hasPath = (pattern) => normalizedPaths.some((filePath) => pattern.test(filePath));
  const combinedText = textBlobs.join("\n");

  if (hasDep("typescript") || hasPath(/(^|\/)tsconfig(\.[^/]+)?\.json$/)) {
    detected.add("typescript");
  }

  if (hasDep("react")) {
    const reactMajor = parseReactMajor(depVersions.get("react"));
    if (reactMajor === null || reactMajor >= 19) {
      detected.add("react-19");
    }
  }

  if (hasDep("next") || hasPath(/(^|\/)next\.config\.(ts|mts|mjs|js|cjs)$/)) {
    detected.add("nextjs");
  }

  if (
    hasDep("tailwindcss") ||
    hasDep("@tailwindcss/vite") ||
    hasDep("@tailwindcss/postcss")
  ) {
    detected.add("tailwind-css");
  }

  if (hasDep("three") || hasDep("@react-three/fiber")) {
    detected.add("threejs");
  }

  if (hasDep("gsap")) {
    detected.add("gsap");
  }

  if (hasDep("motion") || hasDep("framer-motion")) {
    detected.add("motion");
  }

  const hasNodeBackendOrTooling =
    hasVscodeEngine ||
    hasDep("hono") ||
    hasDep("@hono/node-server") ||
    hasDep("fastify") ||
    hasDep("express") ||
    hasPath(/^api\/.+\.(js|ts|mjs)$/) ||
    hasPath(/^(server|apps\/api)\/package\.json$/) ||
    hasPath(/(^|\/)scripts\/sync-[^/]+\.(js|mjs|ts)$/) ||
    (hasDep("next") && (hasDep("pg") || hasDep("prisma") || hasDep("@prisma/client")));

  if (hasNodeBackendOrTooling) {
    detected.add("nodejs");
  }

  if (hasDep("hono") || hasDep("@hono/node-server")) {
    detected.add("hono");
  }

  if (
    hasDep("pg") ||
    hasDep("postgres") ||
    hasDep("@neondatabase/serverless") ||
    hasDep("@prisma/adapter-pg") ||
    (hasDep("@prisma/client") && /postgresql|DATABASE_URL/i.test(combinedText))
  ) {
    detected.add("postgresql");
  }

  if (hasDep("prisma") || hasDep("@prisma/client") || hasPath(/(^|\/)prisma\/schema\.prisma$/)) {
    detected.add("prisma");
  }

  if (
    hasDep("idb") ||
    hasDep("dexie") ||
    hasDep("localforage") ||
    hasDep("@tanstack/query-async-storage-persister")
  ) {
    detected.add("indexeddb");
  }

  if (
    hasDep("@anthropic-ai/sdk") ||
    hasDep("@ai-sdk/anthropic") ||
    /\bANTHROPIC_API_KEY\b|api\.anthropic\.com/i.test(combinedText)
  ) {
    detected.add("claude-api");
  }

  if (
    hasDep("@google/genai") ||
    hasDep("@google/generative-ai") ||
    hasDep("@ai-sdk/google") ||
    /\b(GEMINI_API_KEY|GOOGLE_GENERATIVE_AI_API_KEY)\b|generativelanguage\.googleapis\.com|\bGemini API\b/i.test(
      combinedText,
    )
  ) {
    detected.add("gemini-vision");
  }

  if (
    hasDep("vitest") ||
    hasDep("vite-plus") ||
    hasPath(/(^|\/)vitest\.config\.(ts|mts|mjs|js)$/)
  ) {
    detected.add("vitest");
  }

  if (
    hasDep("@playwright/test") ||
    hasDep("playwright") ||
    hasPath(/(^|\/)playwright\.config\.(ts|mts|mjs|js)$/)
  ) {
    detected.add("playwright");
  }

  if (hasPath(/^\.github\/workflows\/.+\.(yml|yaml)$/)) {
    detected.add("github-actions");
  }

  const isVercelHref = typeof liveHref === "string" && /\.vercel\.app\/?$/i.test(new URL(liveHref).hostname);
  if (
    isVercelHref ||
    hasPath(/^vercel\.json$/) ||
    hasDep("@vercel/functions") ||
    hasDep("@vercel/analytics") ||
    repoName === "ZynzTehr-Profile"
  ) {
    detected.add("vercel");
  }

  return STACK_TOOL_IDS.filter((toolId) => detected.has(toolId));
}

/**
 * Assembles the deterministic stackBuilds.json payload from inspected repository records.
 * Newly discovered repositories rank ahead of the baseline curated set by pushedAt
 * timestamp so newly shipped projects surface automatically inside the 3-card cap.
 */
export function assembleStackBuilds(repoRecords) {
  const projectsById = new Map();

  for (const record of repoRecords) {
    projectsById.set(record.id, {
      id: record.id,
      title: record.title,
      href: record.href,
      sourceHref: record.sourceHref,
    });
  }

  const toolBuilds = {};

  for (const toolId of STACK_TOOL_IDS) {
    const baselineOrder = BASELINE_TOOL_PRIORITY[toolId] || [];
    const baselineIndex = new Map(baselineOrder.map((id, idx) => [id, idx]));

    const matching = repoRecords.filter((record) => record.tools.includes(toolId));

    matching.sort((a, b) => {
      if (a.isCurated !== b.isCurated) {
        return a.isCurated ? 1 : -1;
      }
      if (!a.isCurated && !b.isCurated) {
        return b.pushedAtMs - a.pushedAtMs || a.id.localeCompare(b.id);
      }
      const rankA = baselineIndex.has(a.id) ? baselineIndex.get(a.id) : Number.MAX_SAFE_INTEGER;
      const rankB = baselineIndex.has(b.id) ? baselineIndex.get(b.id) : Number.MAX_SAFE_INTEGER;
      if (rankA !== rankB) return rankA - rankB;
      return b.pushedAtMs - a.pushedAtMs || a.id.localeCompare(b.id);
    });

    toolBuilds[toolId] = matching.slice(0, MAX_BUILDS_PER_TOOL).map((record) => ({
      projectId: record.id,
      usage:
        record.usageByTool?.[toolId] ||
        buildAutoUsageNote(record.description, record.title, toolId),
    }));
  }

  const referencedIds = new Set(
    Object.values(toolBuilds).flatMap((entries) => entries.map((entry) => entry.projectId)),
  );

  const orderedProjectIds = [
    ...Object.values(CURATED_REPO_METADATA).map((meta) => meta.id),
    ...[...projectsById.keys()].sort(),
  ];

  const projects = {};
  for (const id of orderedProjectIds) {
    if (!referencedIds.has(id) || projects[id] || !projectsById.has(id)) continue;
    projects[id] = projectsById.get(id);
  }

  return { projects, toolBuilds };
}

function buildGithubHeaders(token, accept = "application/vnd.github+json") {
  const headers = {
    Accept: accept,
    "User-Agent": "ZynzTehr-Profile-Stack-Sync",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function fetchJson(url, token) {
  const response = await fetch(url, {
    headers: buildGithubHeaders(token),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`GitHub API ${response.status} ${response.statusText} for ${url}`);
  }
  return response.json();
}

async function fetchRawFile(owner, repoName, defaultBranch, filePath, token) {
  const encodedPath = filePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const rawUrl = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(
    repoName,
  )}/${encodeURIComponent(defaultBranch)}/${encodedPath}`;
  const headers = { "User-Agent": "ZynzTehr-Profile-Stack-Sync" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(rawUrl, {
    headers,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) return null;
  return response.text();
}

async function listOwnerRepos(owner, token) {
  const repos = [];
  let page = 1;
  while (page <= 5) {
    const url = `https://api.github.com/users/${encodeURIComponent(
      owner,
    )}/repos?per_page=100&page=${page}&type=owner&sort=pushed`;
    const batch = await fetchJson(url, token);
    if (!Array.isArray(batch) || batch.length === 0) break;
    repos.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return repos;
}

function selectPackageJsonPaths(treePaths) {
  return treePaths.filter((filePath) => {
    if (!/(^|\/)package\.json$/.test(filePath)) return false;
    if (/(^|\/)(node_modules|dist|build|\.next|coverage|vendor|fixtures)\//.test(filePath)) {
      return false;
    }
    const depth = filePath.split("/").length;
    return depth <= 3;
  });
}

function selectSignalTextPaths(treePaths) {
  return treePaths
    .filter((filePath) => {
      if (/(^|\/)(node_modules|dist|build|\.next|coverage|vendor|tests?|__tests__|\.agents)\//.test(filePath)) {
        return false;
      }
      if (/^\.env\.example$/.test(filePath)) return true;
      if (/(^|\/)prisma\/schema\.prisma$/.test(filePath)) return true;
      return /(^|\/)(ai|gemini|anthropic|claude)[A-Za-z0-9._-]*\.(js|mjs|ts)$/.test(filePath);
    })
    .slice(0, 6);
}

async function inspectEligibleRepo(owner, repo, token) {
  const curated = CURATED_REPO_METADATA[repo.name] ?? null;
  const liveHref = normalizeLiveHref(repo.homepage, curated?.fallbackHref);
  if (!liveHref) return null;

  const branch = repo.default_branch || "main";
  const treeUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
    repo.name,
  )}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
  const treePayload = await fetchJson(treeUrl, token);
  const treePaths = Array.isArray(treePayload.tree)
    ? treePayload.tree
        .filter((entry) => entry && entry.type === "blob" && typeof entry.path === "string")
        .map((entry) => entry.path)
    : [];

  const pkgPaths = selectPackageJsonPaths(treePaths);
  const signalPaths = selectSignalTextPaths(treePaths);

  const [rawPackages, rawSignals] = await Promise.all([
    Promise.all(pkgPaths.map((p) => fetchRawFile(owner, repo.name, branch, p, token))),
    Promise.all(signalPaths.map((p) => fetchRawFile(owner, repo.name, branch, p, token))),
  ]);

  const packageManifests = rawPackages.flatMap((raw) => {
    if (!raw) return [];
    try {
      return [JSON.parse(raw)];
    } catch {
      return [];
    }
  });

  const textBlobs = rawSignals.filter((entry) => typeof entry === "string");
  const tools = detectRepoTools({
    repoName: repo.name,
    liveHref,
    treePaths,
    packageManifests,
    textBlobs,
  });

  if (tools.length === 0) return null;

  const id = slugifyProjectId(repo.name);
  const title = formatRepoTitle(repo.name);

  return {
    id,
    repoName: repo.name,
    title,
    href: liveHref,
    sourceHref: repo.html_url || `https://github.com/${owner}/${repo.name}`,
    description: repo.description || "",
    pushedAtMs: Date.parse(repo.pushed_at || repo.updated_at || "1970-01-01T00:00:00Z") || 0,
    isCurated: Boolean(curated),
    usageByTool: curated?.usageByTool ?? null,
    tools,
  };
}

function printUsage() {
  console.log(
    [
      "Usage: node scripts/sync-stack-builds.mjs [--check] [--dry-run] [--output <path>]",
      "",
      "Options:",
      "  --check         Exit 1 if src/data/stackBuilds.json is out of sync with GitHub",
      "  --dry-run       Print sync summary without writing src/data/stackBuilds.json",
      "  --output <path> Override target JSON path",
      "  --help          Show this usage message",
    ].join("\n"),
  );
}

function parseCliArgs(argv) {
  let checkOnly = false;
  let dryRun = false;
  let outputPath = DEFAULT_OUTPUT_PATH;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--check") {
      checkOnly = true;
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--output") {
      const next = argv[i + 1];
      if (!next) {
        throw new Error("Missing value after --output");
      }
      outputPath = path.resolve(process.cwd(), next);
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return { checkOnly, dryRun, outputPath };
}

export async function runSync(options = {}) {
  const owner = options.owner || process.env.GITHUB_OWNER || "ZynzTehr";
  const token = options.token ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "";
  const outputPath = options.outputPath || DEFAULT_OUTPUT_PATH;
  const checkOnly = Boolean(options.checkOnly);
  const dryRun = Boolean(options.dryRun);

  const allRepos = await listOwnerRepos(owner, token);
  const candidates = allRepos.filter(
    (repo) =>
      repo &&
      !repo.fork &&
      !repo.archived &&
      !repo.disabled &&
      !EXCLUDED_REPOS.has(repo.name),
  );

  const inspected = [];
  for (const repo of candidates) {
    const record = await inspectEligibleRepo(owner, repo, token);
    if (record) {
      inspected.push(record);
    }
  }

  const payload = assembleStackBuilds(inspected);
  for (const toolId of STACK_TOOL_IDS) {
    if (!Array.isArray(payload.toolBuilds[toolId]) || payload.toolBuilds[toolId].length === 0) {
      throw new Error(`Refusing to write stackBuilds.json: tool "${toolId}" resolved 0 builds.`);
    }
  }

  const serialized = `${JSON.stringify(payload, null, 2)}\n`;
  let existing = "";
  try {
    existing = await fs.readFile(outputPath, "utf8");
  } catch {
    existing = "";
  }

  const changed = existing !== serialized;

  if (checkOnly) {
    if (changed) {
      throw new Error(`${path.relative(process.cwd(), outputPath)} is out of sync with GitHub.`);
    }
    return { changed: false, projectCount: Object.keys(payload.projects).length };
  }

  if (!dryRun && changed) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, serialized, "utf8");
  }

  return {
    changed,
    projectCount: Object.keys(payload.projects).length,
    payload,
  };
}

const isDirectExecution =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectExecution) {
  try {
    const cli = parseCliArgs(process.argv.slice(2));
    const result = await runSync(cli);
    const status = cli.dryRun
      ? result.changed
        ? "would update"
        : "already up to date"
      : result.changed
        ? "updated"
        : "already up to date";
    console.log(
      `[sync-stack-builds] ${status} (${result.projectCount} shipped projects across ${STACK_TOOL_IDS.length} tools).`,
    );
  } catch (error) {
    console.error(
      `[sync-stack-builds] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}
