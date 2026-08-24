import { describe, expect, it } from 'vitest';

import pkg from '../package.json';
import { PIPELINE_CHECK, pipelineCheck } from './index';

describe('pipelineCheck', () => {
  it('returns the pipeline marker', () => {
    expect(pipelineCheck()).toBe(PIPELINE_CHECK);
  });

  // The marker's whole job is telling you which published artifact a consumer actually
  // resolved, and it is hardcoded. A version bump that forgets to update it produces a marker
  // that confidently reports the wrong version — exactly the failure it exists to rule out.
  it('stays in sync with the package version', () => {
    expect(PIPELINE_CHECK).toBe(`${pkg.name}@${pkg.version}`);
  });
});
