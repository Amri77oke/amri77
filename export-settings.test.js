import test from 'node:test';
import assert from 'node:assert/strict';
import {PRESETS, validateSettings, bitrateFor, estimatedBytesFor, MAX_DURATION} from './export-settings.js';
import {FORMAT_CANDIDATES} from './render-capabilities.js';
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
test('durations beyond 30 seconds are supported', () => {
  assert.equal(validateSettings({...defaults, dur: 31}), 930);
  assert.equal(validateSettings({...defaults, dur: MAX_DURATION}), MAX_DURATION * 30);
});
test('estimated output size scales with bitrate and duration', () => {
  assert.equal(estimatedBytesFor(defaults, 'medium'), Math.round(bitrateFor(defaults, 'medium') / 8 * defaults.dur));
  assert.ok(estimatedBytesFor({...defaults, dur: MAX_DURATION}, 'very-high') > estimatedBytesFor(defaults, 'low'));
});
test('format candidates are unique, ordered and internally consistent', () => {
  const ids = FORMAT_CANDIDATES.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(FORMAT_CANDIDATES[0].codec, 'h264');
  for (const candidate of FORMAT_CANDIDATES) {
    assert.ok(candidate.mediabunnyCodec);
    assert.match(candidate.extension, /^(mp4|webm)$/);
    assert.match(candidate.mime, /^video\//);
    assert.ok(candidate.label);
    assert.equal(candidate.container, candidate.extension);
  }
});
