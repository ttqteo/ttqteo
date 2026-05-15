import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";

const execFileP = promisify(execFile);

export type GitFileMeta = {
  lastCommitIso: string | null;
  lastCommitSha: string | null;
};

const cache = new Map<string, GitFileMeta>();

export async function getGitFileMeta(absPath: string): Promise<GitFileMeta> {
  if (cache.has(absPath)) return cache.get(absPath)!;

  const repoRoot = process.cwd();
  const rel = path.relative(repoRoot, absPath).replace(/\\/g, "/");

  try {
    const { stdout } = await execFileP(
      "git",
      ["log", "-1", "--format=%cI%n%H", "--", rel],
      { cwd: repoRoot, windowsHide: true },
    );
    const [iso, sha] = stdout.trim().split("\n");
    const meta: GitFileMeta = {
      lastCommitIso: iso || null,
      lastCommitSha: sha || null,
    };
    cache.set(absPath, meta);
    return meta;
  } catch {
    const meta: GitFileMeta = { lastCommitIso: null, lastCommitSha: null };
    cache.set(absPath, meta);
    return meta;
  }
}

export function buildGitHubFileUrl(opts: {
  owner: string;
  repo: string;
  branch?: string;
  relPath: string;
  view: "history" | "blob";
}) {
  const { owner, repo, branch = "master", relPath, view } = opts;
  const segment = view === "history" ? "commits" : "blob";
  return `https://github.com/${owner}/${repo}/${segment}/${branch}/${relPath}`;
}
