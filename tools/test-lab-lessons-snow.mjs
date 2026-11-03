import test from 'node:test';
import assert from 'node:assert/strict';
import {SNOWS, WAXES, waxBench, waxRunResult, snowOfDay} from '../src/lab/benches/wax.js';
import {Group} from 'three';
import {nameFirstAid} from '../src/lab/lessons/snow-display.js';

test('the wax challenge’s daily rules: the day’s snow decides the wax, and the wrong wax glides slower', () => {
  for (const snow of Object.keys(SNOWS)) for (const pick of WAXES) {
    const r = waxBench.run({snow, wax: pick});
    if (r.right) assert.equal(r.glideS, r.bestGlideS); else assert.ok(r.glideS > r.bestGlideS);
  }
  for (let day = 0; day < 30; day++) {
    const today = snowOfDay(day);
    for (const pick of WAXES) assert.equal(waxRunResult({day, pick, time: 999}).pass, pick === today.wax);
    assert.equal(waxRunResult({day, pick: today.wax, time: 0}).pass, false);
  }
  assert.equal(waxBench.run({snow: 'powder', wax: 'soft'}).glideS, waxBench.run({snow: 'powder', wax: 'medium'}).glideS);
});

test('the wall label does not require a 2D canvas in a graphics-free room', () => {
  const root = new Group();
  nameFirstAid(root, {createElement: () => ({})}, {});
  nameFirstAid(root, {createElement: () => ({getContext: () => null})}, {});
  assert.equal(root.children.length, 0);
});
