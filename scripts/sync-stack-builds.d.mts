export interface SyncStackReel {
  video: string;
  poster: string;
  source: "repo" | "borrowed" | "local";
}

export interface SyncStackProject {
  id: string;
  title: string;
  href: string;
  sourceHref: string;
  reel: SyncStackReel | null;
}

export interface ReelAsset {
  kind: "local" | "remote";
  path: string;
  sha: string;
  repoName?: string;
  branch?: string;
}

export interface ResolvedReel {
  source: SyncStackReel["source"];
  video: ReelAsset;
  poster: ReelAsset | null;
}

export interface RepoTree {
  branch: string;
  shas: ReadonlyMap<string, string>;
}

export interface SyncStackToolBuild {
  projectId: string;
  usage: string;
}

export interface SyncRepoRecord {
  id: string;
  repoName: string;
  title: string;
  href: string;
  sourceHref: string;
  description: string;
  pushedAtMs: number;
  isCurated: boolean;
  usageByTool: Partial<Record<string, string>> | null;
  tools: readonly string[];
  reel?: SyncStackReel | null;
}

export interface DetectRepoToolsInput {
  repoName: string;
  liveHref: string;
  treePaths: readonly string[];
  packageManifests: ReadonlyArray<Record<string, unknown>>;
  textBlobs?: readonly string[];
}

export const STACK_TOOL_LABELS: Readonly<Record<string, string>>;
export const STACK_TOOL_IDS: readonly string[];
export const EXCLUDED_REPOS: ReadonlySet<string>;
export const REEL_RECIPE: Readonly<{
  version: string;
  width: number;
  height: number;
  maxSeconds: number;
  fps: number;
  crf: number;
  posterQuality: number;
}>;
export const REEL_PUBLIC_PREFIX: string;
export const BORROWED_REEL_MEDIA: Readonly<Record<string, { repoName: string; dir: string }>>;

export function gitBlobSha(bytes: Uint8Array | string): string;
export function resolveReelSource(input: {
  projectId: string;
  repoName: string;
  repoTrees: ReadonlyMap<string, RepoTree>;
  localFiles?: { video: { path: string; sha: string }; poster: { path: string; sha: string } | null } | null;
}): ResolvedReel | null;
export function reelKey(resolved: ResolvedReel, recipeVersion?: string): string;
export function buildReelEntry(projectId: string, resolved: ResolvedReel | null): SyncStackReel | null;

export function normalizeLiveHref(rawHomepage: unknown, fallbackHref?: string): string | null;
export function slugifyProjectId(repoName: string): string;
export function sanitizeVisibleCopy(text: unknown): string;
export function formatRepoTitle(repoName: string): string;
export function buildAutoUsageNote(rawDescription: unknown, title: string, toolId: string): string;
export function detectRepoTools(input: DetectRepoToolsInput): string[];
export function assembleStackBuilds(repoRecords: readonly SyncRepoRecord[]): {
  projects: Record<string, SyncStackProject>;
  toolBuilds: Record<string, SyncStackToolBuild[]>;
};
