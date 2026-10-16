import test from 'node:test';
import assert from 'node:assert/strict';
import {PRESETS, validateSettings, bitrateFor} from './export-settings.js';
const defaults = {width: 1280, height: 720, fps: 30, dur: 4};
test('all resolution presets produce valid H.264 dimensions and exact frame counts', () => {
  for (const [width, height] of Object.values(PRESETS)) assert.equal(validateSettings({...defaults, width, height}), 120);
  assert.equal(validateSettings({...defaults, dur: 1.25, fps: 24}), 30);
});
test('invalid codec dimensions and unsafe timelines are rejected', () => {
  for (const change of [{width: 1919}, {height: 0}, {width: 4098}, {width: NaN}, {fps: 0}, {fps: 61}, {fps: 29.5}, {dur: Infinity}, {dur: 301}]) {
    assert.throws(() => validateSettings({...defaults, ...change}));
  }
});
test('bitrate scales with resolution, frame rate and quality', () => {
  assert.ok(bitrateFor(defaults, 'high') > bitrateFor(defaults, 'medium'));
  assert.ok(bitrateFor({...defaults, width: 3840, height: 2160}, 'high') > bitrateFor(defaults, 'high'));
  assert.ok(bitrateFor({...defaults, fps: 60}, 'high') > bitrateFor(defaults, 'high'));
});
