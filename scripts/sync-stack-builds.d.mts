export interface SyncStackProject {
  id: string;
  title: string;
  href: string;
  sourceHref: string;
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
