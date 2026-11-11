export const PORTFOLIO_URL = "https://zynztehr.github.io/ZynzTehr-Portfolio/";
export const GITHUB_URL = "https://github.com/ZynzTehr";
export const GITHUB_REPOS_URL = "https://github.com/ZynzTehr?tab=repositories";
export const LINKEDIN_URL = "https://www.linkedin.com/in/jorge-bucio-876738393/";
export const CONTACT_EMAIL = "jorgeforwork88@gmail.com";

export const SEO_META = {
  title: "Jorge Bucio | Full-Stack & Applied AI Software Engineer",
  description:
    "Southern California full-stack and applied AI software engineer crafting expressive web interfaces, resilient backends, and practical automation.",
} as const;

export const MONARCH_IMAGE_ALT =
  "California Monarch butterfly resting on blank deckled cotton-rag paper beside a solid brass drafting divider on sunlit travertine";

export const PORTFOLIO_IMAGE_ALT =
  "Sunlit Southern California limestone studio porch with olive tree shadows";

export interface ChapterNavItem {
  id: string;
  actAttr: string;
  numeral: "I" | "II" | "III" | "IV" | "V";
  label: string;
  href: string;
}

export interface HeroContent {
  firstName: string;
  lastName: string;
  locationLabel: string;
  roleLine: string;
  lead: string;
  handNote: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
}

export interface JourneyContent {
  eyebrow: string;
  headlinePlain: string;
  headlineAccent: string;
  milestones: ReadonlyArray<{ period: string; label: string }>;
  paragraphs: readonly [string, string];
  handNote: string;
}

export interface CraftDiscipline {
  id: string;
  index: "01" | "02" | "03" | "04";
  title: string;
  summary: string;
  detail: string;
  deliverables: readonly string[];
  arcPath: string;
}

export interface CraftSectionContent {
  eyebrow: string;
  headlineTopPlain: string;
  headlineTopItalic: string;
  headlineBottomPlain: string;
  headlineBottomItalic: string;
  lead: string;
  handNote: string;
}

export type StackColumnId = "frontend" | "backend" | "data-ai" | "verification";

export type StackToolId =
  | "typescript"
  | "react-19"
  | "nextjs"
  | "tailwind-css"
  | "threejs"
  | "gsap"
  | "motion"
  | "nodejs"
  | "hono"
  | "postgresql"
  | "prisma"
  | "indexeddb"
  | "claude-api"
  | "gemini-vision"
  | "vitest"
  | "playwright"
  | "github-actions"
  | "vercel";

export interface StackTool {
  id: StackToolId;
  label: string;
  columnId: StackColumnId;
  pairedIds: readonly StackToolId[];
  craftNote: string;
}

export interface StackColumn {
  id: StackColumnId;
  roman: "I" | "II" | "III" | "IV";
  title: string;
  tools: readonly StackTool[];
}

export interface StackSectionContent {
  eyebrow: string;
  headlinePlain: string;
  headlineItalic: string;
  lead: string;
  handNote: string;
  resetLabel: string;
}

export interface PortfolioPortalContent {
  eyebrow: string;
  headlinePlain: string;
  headlineItalic: string;
  description: string;
  caption: string;
  primaryLabel: string;
  secondaryLabel: string;
  handNote: string;
}

export interface ConnectChannel {
  id: string;
  label: string;
  valueLabel: string;
  href: string;
  external: boolean;
}

export interface ConnectContent {
  eyebrow: string;
  headlinePlain: string;
  headlineItalic: string;
  lead: string;
  emailLabel: string;
  copyLabel: string;
  copiedLabel: string;
  fallbackNotice: string;
  handNote: string;
  footerLine: string;
  colophonTriggerLabel: string;
  channels: readonly ConnectChannel[];
}

export interface ColophonContent {
  title: string;
  subtitle: string;
  closeLabel: string;
  notes: ReadonlyArray<{ heading: string; body: string }>;
}

export const CHAPTER_ITEMS: readonly ChapterNavItem[] = [
  {
    id: "journey",
    actAttr: "01-journey",
    numeral: "I",
    label: "My Journey",
    href: "#journey",
  },
  {
    id: "craft",
    actAttr: "02-craft",
    numeral: "II",
    label: "Capabilities & Craft",
    href: "#craft",
  },
  {
    id: "stack",
    actAttr: "03-stack",
    numeral: "III",
    label: "Technical Repertoire",
    href: "#stack",
  },
  {
    id: "portfolio",
    actAttr: "04-portfolio",
    numeral: "IV",
    label: "Live Portfolio Portal",
    href: "#portfolio",
  },
  {
    id: "connect",
    actAttr: "05-connect",
    numeral: "V",
    label: "Let's Connect",
    href: "#connect",
  },
];

export const HERO_CONTENT: HeroContent = {
  firstName: "JORGE",
  lastName: "BUCIO",
  locationLabel: "Menifee, Southern California",
  roleLine: "Full-Stack & Applied AI Software Engineer",
  lead: "Crafting tactile web interfaces, resilient TypeScript backends, and practical AI workflows shaped by eleven years of real-world operations.",
  handNote: "California light, cotton rag & working code",
  primaryCtaLabel: "Explore Portfolio",
  secondaryCtaLabel: "Connect",
};

export const JOURNEY_CONTENT: JourneyContent = {
  eyebrow: "Chapter I · Origin & Discipline",
  headlinePlain: "Eleven years in the yard.",
  headlineAccent: "Since 2024, in code.",
  milestones: [
    { period: "2012 to 2023", label: "Southern California Class 8 Freight & Fleet Operations" },
    {
      period: "2024 to Present",
      label: "The Last Mile, Fair Chance Futures & Next Chapter",
    },
  ],
  paragraphs: [
    "From 2012 to 2023 across Southern California Class 8 freight yards, dispatch desks, and preventive fleet maintenance bays, every day came down to clear handoffs, calm triage under pressure, and systems that held together at five in the morning.",
    "Since 2024, trained through The Last Mile, Fair Chance Futures' PAISE Program, and Next Chapter's applied AI, that operational discipline shapes how every interface, typed service boundary, and forward-looking AI workflow gets built to stay readable under stress and verified end to end.",
  ],
  handNote: "2012-2023 operations · 2024-present engineering",
};

export const CRAFT_CONTENT: CraftSectionContent = {
  eyebrow: "Chapter II · Capabilities & Craft",
  headlineTopPlain: "Interfaces that ",
  headlineTopItalic: "breathe.",
  headlineBottomPlain: "Backends that ",
  headlineBottomItalic: "hold.",
  lead: "Every layer is treated as physical craft, from fluid scroll and shader lighting on the glass down to strictly typed database transactions underneath.",
  handNote: "Four disciplines, one standard of finish",
};

export const CRAFT_DISCIPLINES: readonly CraftDiscipline[] = [
  {
    id: "frontend-motion",
    index: "01",
    title: "Interactive Frontend & Motion",
    summary: "Editorial React 19 and TypeScript interfaces with cinema-grade pacing.",
    detail:
      "Choreographing GSAP scroll stages, Motion spring physics, and Three.js custom GLSL shaders so movement clarifies spatial hierarchy while maintaining crisp frame pacing across desktop and mobile.",
    deliverables: [
      "GSAP ScrollTrigger & SplitText choreography",
      "Three.js custom GLSL lighting & depth planes",
      "Responsive Tailwind v4 & tactile material CSS",
    ],
    arcPath: "M 24 136 A 112 112 0 0 1 212 52",
  },
  {
    id: "backend-persistence",
    index: "02",
    title: "Full-Stack APIs & Persistence",
    summary: "Strictly typed service boundaries and relational schemas built for real load.",
    detail:
      "Designing Node.js, Hono, and Next.js APIs backed by PostgreSQL and Prisma with boundary validation, OAuth 2.0 session security, idempotent writes, and zero-surprise migrations.",
    deliverables: [
      "Node.js, Hono & Next.js typed endpoints",
      "PostgreSQL & Prisma relational data modeling",
      "Boundary input validation & OAuth 2.0 auth",
    ],
    arcPath: "M 28 118 A 128 128 0 0 1 224 78",
  },
  {
    id: "applied-ai",
    index: "03",
    title: "Practical AI Engineering",
    summary: "Deterministic multimodal and document workflows that save real operational hours.",
    detail:
      "Wiring Claude and Gemini Vision into structured extraction, OCR document triage, and tool-calling pipelines guarded by strict schema checks, timeouts, and human-auditable outputs.",
    deliverables: [
      "Claude API structured tool & agent workflows",
      "Gemini Vision multimodal & OCR extraction",
      "Schema-validated outputs & fallback guards",
    ],
    arcPath: "M 32 142 A 98 98 0 0 1 218 44",
  },
  {
    id: "verification-delivery",
    index: "04",
    title: "Verification & Delivery",
    summary: "Repeatable automated proof from unit contracts through live browser gates.",
    detail:
      "Backing every feature with fast Vitest unit suites, Playwright end-to-end and accessibility assertions, clean Git history, and zero-downtime GitHub Actions and Vercel deployments.",
    deliverables: [
      "Vitest unit & boundary security suites",
      "Playwright E2E, visual & Axe verification",
      "GitHub Actions CI & Vercel edge delivery",
    ],
    arcPath: "M 20 128 A 118 118 0 0 1 228 62",
  },
];

export const STACK_CONTENT: StackSectionContent = {
  eyebrow: "Chapter III · Technical Repertoire",
  headlinePlain: "Tools of the ",
  headlineItalic: "trade.",
  lead: "Eighteen production instruments across four columns. Select any tool to illuminate the companions it pairs with in real builds.",
  handNote: "Select any tool to trace how it pairs in production",
  resetLabel: "Show full repertoire",
};

export const STACK_COLUMNS: readonly StackColumn[] = [
  {
    id: "frontend",
    roman: "I",
    title: "Frontend & Motion",
    tools: [
      {
        id: "typescript",
        label: "TypeScript",
        columnId: "frontend",
        pairedIds: ["react-19", "hono", "prisma", "vitest"],
        craftNote: "End-to-end domain contracts shared across UI state, API handlers, database queries, and tests.",
      },
      {
        id: "react-19",
        label: "React 19",
        columnId: "frontend",
        pairedIds: ["typescript", "nextjs", "motion", "vitest"],
        craftNote: "Component architecture driving interactive specimens, accessible dialogs, and deterministic state.",
      },
      {
        id: "nextjs",
        label: "Next.js",
        columnId: "frontend",
        pairedIds: ["react-19", "postgresql", "prisma", "vercel"],
        craftNote: "Full-stack React application routing paired with PostgreSQL persistence and Vercel edge delivery.",
      },
      {
        id: "tailwind-css",
        label: "Tailwind CSS",
        columnId: "frontend",
        pairedIds: ["react-19", "gsap", "motion"],
        craftNote: "Design-token utility composition layered cleanly over custom editorial typography and material CSS.",
      },
      {
        id: "threejs",
        label: "Three.js & GLSL",
        columnId: "frontend",
        pairedIds: ["gsap", "react-19", "typescript"],
        craftNote: "3D displaced relief geometry, raking caustic sunlight shaders, and atmospheric particle fields.",
      },
      {
        id: "gsap",
        label: "GSAP",
        columnId: "frontend",
        pairedIds: ["threejs", "motion", "playwright"],
        craftNote: "Scroll-scrubbed pinned transitions, SplitText editorial reveals, and SVG drafting strokes.",
      },
      {
        id: "motion",
        label: "Motion",
        columnId: "frontend",
        pairedIds: ["react-19", "gsap", "tailwind-css"],
        craftNote: "Interruptible spring physics for tactile discipline tabs, pairing lenses, and modal sheets.",
      },
    ],
  },
  {
    id: "backend",
    roman: "II",
    title: "Backend & APIs",
    tools: [
      {
        id: "nodejs",
        label: "Node.js",
        columnId: "backend",
        pairedIds: ["typescript", "hono", "postgresql", "github-actions"],
        craftNote: "Server runtime powering API services, AI orchestration pipelines, and automated build tooling.",
      },
      {
        id: "hono",
        label: "Hono",
        columnId: "backend",
        pairedIds: ["typescript", "nodejs", "postgresql", "vitest"],
        craftNote: "Lightweight, Web-Standards HTTP routing with strict TypeScript request and response inference.",
      },
      {
        id: "postgresql",
        label: "PostgreSQL",
        columnId: "backend",
        pairedIds: ["prisma", "nextjs", "hono", "nodejs"],
        craftNote: "Primary relational store for fleet records, audit trails, and transactional application data.",
      },
      {
        id: "prisma",
        label: "Prisma",
        columnId: "backend",
        pairedIds: ["postgresql", "typescript", "nextjs"],
        craftNote: "Declarative schema migrations and type-safe relational queries against PostgreSQL.",
      },
    ],
  },
  {
    id: "data-ai",
    roman: "III",
    title: "Data & Applied AI",
    tools: [
      {
        id: "indexeddb",
        label: "IndexedDB",
        columnId: "data-ai",
        pairedIds: ["typescript", "react-19", "playwright"],
        craftNote: "Local-first browser persistence for resilient offline workspaces and instant client state.",
      },
      {
        id: "claude-api",
        label: "Claude API",
        columnId: "data-ai",
        pairedIds: ["typescript", "nodejs", "hono", "vitest"],
        craftNote: "Structured reasoning, tool execution, and long-context document synthesis with strict guards.",
      },
      {
        id: "gemini-vision",
        label: "Gemini Vision",
        columnId: "data-ai",
        pairedIds: ["typescript", "nodejs", "postgresql", "vitest"],
        craftNote: "Multimodal visual inspection and high-accuracy OCR extraction from operational documents.",
      },
    ],
  },
  {
    id: "verification",
    roman: "IV",
    title: "Testing & Delivery",
    tools: [
      {
        id: "vitest",
        label: "Vitest",
        columnId: "verification",
        pairedIds: ["typescript", "react-19", "hono", "claude-api"],
        craftNote: "Fast unit and component contract verification across domain logic, UI interactions, and APIs.",
      },
      {
        id: "playwright",
        label: "Playwright",
        columnId: "verification",
        pairedIds: ["gsap", "indexeddb", "github-actions", "vercel"],
        craftNote: "Real Chromium end-to-end, scroll-midpoint geometry, mobile viewport, and accessibility proof.",
      },
      {
        id: "github-actions",
        label: "GitHub Actions",
        columnId: "verification",
        pairedIds: ["vitest", "playwright", "vercel", "nodejs"],
        craftNote: "Automated CI gates and scheduled SVG pipelines keeping repository artifacts verified.",
      },
      {
        id: "vercel",
        label: "Vercel",
        columnId: "verification",
        pairedIds: ["nextjs", "playwright", "github-actions"],
        craftNote: "Immutable edge asset caching, preview environments, and hardened serverless endpoints.",
      },
    ],
  },
];

export const ALL_STACK_TOOLS: readonly StackTool[] = STACK_COLUMNS.flatMap((col) => col.tools);

export const PORTFOLIO_CONTENT: PortfolioPortalContent = {
  eyebrow: "Chapter IV · Selected Works Gateway",
  headlinePlain: "See the work in ",
  headlineItalic: "motion.",
  description:
    "Full interactive applications, live deployments, and architectural walkthroughs live in a dedicated 3D WebGL portfolio space built to let each project speak at full scale.",
  caption: "External 3D WebGL Showcase · zynztehr.github.io/ZynzTehr-Portfolio",
  primaryLabel: "Open Live Portfolio",
  secondaryLabel: "All GitHub Repos",
  handNote: "Selected applications & experiments",
};

export const CONNECT_CONTENT: ConnectContent = {
  eyebrow: "Chapter V · Direct Dispatch",
  headlinePlain: "Let's build something ",
  headlineItalic: "lasting.",
  lead: "Available for full-stack software engineering roles, bespoke interactive web builds, and practical AI workflow architecture. Direct channels only, zero forms.",
  emailLabel: "Electronic Mail",
  copyLabel: "Copy address",
  copiedLabel: "Copied",
  fallbackNotice: "Select or tap email to mail directly",
  handNote: "Direct line, Southern California (PT)",
  footerLine: "Menifee, California · © 2026",
  colophonTriggerLabel: "Colophon & Craft Notes",
  channels: [
    {
      id: "portfolio",
      label: "Interactive Portfolio",
      valueLabel: "ZynzTehr-Portfolio",
      href: PORTFOLIO_URL,
      external: true,
    },
    {
      id: "github",
      label: "GitHub",
      valueLabel: "github.com/ZynzTehr",
      href: GITHUB_URL,
      external: true,
    },
    {
      id: "linkedin",
      label: "Connect on LinkedIn",
      valueLabel: "LinkedIn Profile",
      href: LINKEDIN_URL,
      external: true,
    },
  ],
};

export const COLOPHON_CONTENT: ColophonContent = {
  title: "Colophon & Studio Notes",
  subtitle: "Edition II · The Atelier Folio",
  closeLabel: "Close colophon",
  notes: [
    {
      heading: "Typography",
      body: "Set in self-hosted Imbue Variable for Didone display marks, Newsreader Variable for literary text and italic counterpoints, Jost Variable for drafting labels, and Nothing You Could Do for studio marginalia.",
    },
    {
      heading: "Rendering & Choreography",
      body: "Built with Vite, React 19, TypeScript, and Tailwind CSS v4. Motion combines GSAP ScrollTrigger and DrawSVG timelines, Motion spring physics, desktop Lenis inertia, and a Three.js 3D displaced relief and golden dust-mote scene.",
    },
    {
      heading: "Material Palette",
      body: "Grounded in honed Southern California sand travertine, deckled cotton-rag paper, deep espresso, warm limewash, botanical olive, unbleached calico, and burnt Monarch terracotta.",
    },
  ],
};
