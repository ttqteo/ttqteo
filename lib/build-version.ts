/** What the page currently on screen was built from. */
export const CURRENT_BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "unknown";

/**
 * Whether `served` is a build other than the one this page loaded.
 *
 * `unknown` on either side means the build id never made it through — a
 * misconfigured env, or a route answering from somewhere unexpected. That is
 * not evidence of a new deploy, and prompting on it would nag on every check
 * forever, so it counts as "no".
 */
export function isNewerBuild(served: unknown, current = CURRENT_BUILD_ID): boolean {
  if (typeof served !== "string" || !served) return false;
  if (served === "unknown" || current === "unknown") return false;
  return served !== current;
}
