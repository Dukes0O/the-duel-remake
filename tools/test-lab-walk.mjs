import test from 'node:test';
import assert from 'node:assert/strict';
import {createWalker, stepWalker, canStand, machinePrompts, WALK} from '../src/lab/lab-walk.js';
import {lessonRows} from '../src/lab/lab-lessons.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {machineApproaches, brianPosition, WALK_LAYOUT, stationPrompt} from '../src/lab/lab-walk.js';
import {readFileSync} from 'node:fs';

const hall = {halfWidth: 15, halfDepth: 9};
test('walking stops at every wall and a thin machine, including diagonal sliding', () => {
  const bounds = [{minX: -1, maxX: 1, minZ: 3, maxZ: 3.05}];
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const w = {...createWalker(), yaw};
    for (let i = 0; i < 1000; i++) stepWalker(w, {forward: 1}, .1, bounds, hall);
    assert.ok(canStand(w.x, w.z, bounds, hall));
    if (yaw === 0) assert.ok(w.z >= 3.05 + WALK.radius - 1e-7);
  }
  const w = createWalker();
  for (let i = 0; i < 100; i++) stepWalker(w, {forward: 1}, .1, bounds, hall);
  for (let i = 0; i < 100; i++) stepWalker(w, {forward: 1, side: 1}, .1, bounds, hall);
  assert.ok(w.x > 1.5 && w.z < 3, 'slides around the edge without crossing the machine');
});
test('walking is level, accelerates gently, turns at 90 degrees/s and normalizes diagonals', () => {
  const w = createWalker(); stepWalker(w, {forward: 1}, .1, [], hall);
  assert.ok(Math.abs(w.vz) <= .5 + 1e-9);
  const turning = createWalker();
  for (let i = 0; i < 10; i++) stepWalker(turning, {turn: 1}, .1, [], hall);
  assert.ok(Math.abs(turning.yaw - Math.PI / 2) < 1e-9);
  for (let i = 0; i < 20; i++) stepWalker(w, {forward: 1, side: 1}, .1, [], hall);
  assert.ok(Math.hypot(w.vx, w.vz) <= WALK.speed + 1e-9);
  assert.equal(w.pitch, 0); assert.equal(WALK.eye, 1.6);
});
test('all sixteen prompts follow actual open, locked and passed lesson rules', () => {
  const flags = {enabled: () => true};
  for (const profile of [{}, {heli: {version: 1, lessons: {liftoff: true, hover: true, landing: true, carry: true}},
    drivingLessons: {version: 1, done: {corner: true}}, lab: {version: 1, done: {lift: true, rust: true}}}]) {
    const rows = lessonRows(profile, flags), prompts = machinePrompts(rows);
    assert.equal(prompts.length, 16);
    for (const row of rows) {
      const p = prompts.find(p => p.id === row.id);
      assert.equal(p.state, row.done ? 'passed' : row.open ? 'open' : 'locked');
      assert.equal(p.prompt.includes('E: use'), row.open);
      assert.equal(p.prompt.startsWith('✓'), row.done);
      if (!row.open) assert.equal(p.prompt.replace(/^✓ /, ''), row.note);
    }
  }
});
test('lab-2 is opt-in private development only', () => {
  assert.equal(createFeatureFlags({storage: null, qa: false, search: '?flags=lab-2'}).enabled('lab-2'), false);
  assert.equal(createFeatureFlags({storage: null, qa: true}).enabled('lab-2'), false);
  assert.equal(createFeatureFlags({storage: null, qa: true, search: '?flags=lab-2'}).enabled('lab-2'), true);
});
test('the shared wind tunnel reports its lock reason, open choice or all-passed tick', () => {
  const ids = ['grip', 'downforce', 'braking', 'suspension', 'fuel'];
  const rows = lessonRows({}, {enabled: () => true});
  const locked = stationPrompt(ids, rows);
  assert.equal(locked.text, 'Opens after driving lesson 1');
  assert.match(locked.floor, /Locked/); assert.equal(locked.done, false);
  const open = rows.map(r => ({...r, open: true}));
  assert.match(stationPrompt(ids, open).text, /E: choose/);
  const passed = stationPrompt(ids, open.map(r => ({...r, done: true})));
  assert.equal(passed.done, true); assert.match(passed.floor, /^✓/);
});
test('every real machine has a clear approach and a standing place for Brian, including the wall-side tunnel and ramp', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/assets/models/lab/manifest.json', import.meta.url)));
  const bounds = manifest.models.filter(m => WALK_LAYOUT[m.id]).map(m => {
    const [x, z] = WALK_LAYOUT[m.id], b = m.footprint;
    return {id: m.id, minX: x + b.minX * WALK.scale, maxX: x + b.maxX * WALK.scale,
      minZ: z + b.minZ * WALK.scale, maxZ: z + b.maxZ * WALK.scale};
  });
  for (const bound of bounds.filter(b => b.id !== 'weights-and-cans')) {
    const at = machineApproaches(bound, bounds, manifest.hall)[0];
    assert.ok(at, `${bound.id}: a usable approach inside the walls`);
    const station = {x: at[0], z: at[1], bound};
    const brian = brianPosition(station, bounds, manifest.hall);
    assert.ok(brian, `${bound.id}: Brian stands outside machines and walls`);
    assert.ok(canStand(...brian, bounds, manifest.hall));
  }
});
