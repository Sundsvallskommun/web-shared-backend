#!/usr/bin/env node
'use strict';

// Post-build smoke test. Deliberately plain CommonJS with no framework and no TypeScript:
//
//   1. It loads dist/ the way a consumer does (require), which is the one thing vitest cannot
//      check — vitest runs the TypeScript sources through its own transform, so a broken
//      CommonJS emit would sail past it.
//   2. It runs on any Node the package claims to support. vitest 4 requires Node >= 20, but
//      engines is ">=18.18" because msbolag and katla are still on node:18-slim.

const assert = require('node:assert/strict');

const pkg = require('../package.json');
const dist = require('../dist');

assert.equal(typeof dist.pipelineCheck, 'function', 'dist must export pipelineCheck()');
assert.equal(typeof dist.PIPELINE_CHECK, 'string', 'dist must export PIPELINE_CHECK');
assert.equal(dist.pipelineCheck(), dist.PIPELINE_CHECK);
assert.equal(dist.PIPELINE_CHECK, `${pkg.name}@${pkg.version}`);

console.log(`smoke ok: ${pkg.name}@${pkg.version} loads from dist/ on node ${process.version}`);
