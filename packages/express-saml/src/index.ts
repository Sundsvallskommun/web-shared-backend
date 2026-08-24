/**
 * Placeholder release (0.0.x).
 *
 * This version exists only to prove the publish pipeline end to end: publish from CI to
 * npmjs via trusted publishing, then install in a consumer in local dev, in CI, and in a
 * Docker build.
 *
 * No SAML code ships here by design. Mixing a behaviour change into the pipeline proof makes
 * a failure ambiguous — if an install or an image build breaks, it should be unambiguously
 * the pipeline. The real API (`createSamlRouter`, `samlGuard`) lands in 0.1.0.
 *
 * See the CODE_REUSE.md planning doc (kept outside this repo), steps 1 and 2.
 */

/** Identifies the published artifact a consumer actually resolved. */
export const PIPELINE_CHECK = '@sk-web-backend/express-saml@0.0.2';

/**
 * Returns the marker above. Call it from a consumer once to confirm the package resolved,
 * built into `dist/`, and loaded at runtime inside the container.
 *
 * Pass `context` to tag where the call came from — the same consumer is verified in local dev,
 * in CI and inside a Docker image, and the three log lines are otherwise indistinguishable:
 *
 * ```ts
 * console.log(pipelineCheck('docker'));
 * // @sk-web-backend/express-saml@0.0.2 (docker)
 * ```
 *
 * Deliberately takes no Node globals, so the emitted CommonJS stays loadable on every runtime
 * `engines` allows.
 */
export function pipelineCheck(context?: string): string {
  return context ? `${PIPELINE_CHECK} (${context})` : PIPELINE_CHECK;
}
