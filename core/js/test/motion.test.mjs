// The JS runtime's behavior is recorded in core/spec/motion-traces.json (see core/tools/motion-driver.mjs).
// This runs the recorder in a separate process (it replaces global timers, which must not touch the test runner)
// and fails if the recording on disk no longer matches what the runtime does.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('the runtime still does exactly what core/spec/motion-traces.json records', () => {
  const r = spawnSync(process.execPath, [new URL('../../tools/generate-motion-traces.mjs', import.meta.url).pathname, '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});
