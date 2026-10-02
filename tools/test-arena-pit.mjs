import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Course} from '../src/course.js';
import {Duel} from '../src/game.js';
import {CARS, COURSE} from '../src/config.js';
import {ARENA_VENUES, SCRAPDOME_VENUE, spawnSlots, venueCurvatureRatio} from '../src/arena/venues.js';
import {placeActor} from '../src/arena/arena-event.js';
import {worldPose, containInArena} from '../src/arena/arena-floor.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {createFeatureFlags} from '../src/feature-flags.js';

// SCRAPDOME 2: real Course and native Duel paths. No substitute working Pit.
const DT = 1 / 120;
const flags = () => createFeatureFlags({storage: null, qa: true, search: '?flags=salt-flats',
  overrides: {wasteland2: true, 'hidden-road': true, scrapdome: true, warlords: true, 'fuel-run': true}});
const hash = value => createHash('sha256').update(value).digest('hex');
const near = (a, b, tolerance = .001) => assert.ok(Math.abs(a - b) <= tolerance, `${a} differs from ${b}`);
function course() {
  assert.ok(ARENA_VENUES.pit, 'the actual venue registry must contain the settled Pit');
  return new Course(ARENA_VENUES.pit, 1989);
}
function centre(c) {
  const a = c.worldAt(0), b = c.worldAt(c.length / 2);
  return {x: (a.x + b.x) / 2, z: (a.z + b.z) / 2};
}
function start({car = 'falcone_f42', brain = 'rammer', difficulty = 'medium'} = {}) {
  const duel = new Duel({seed: 1989, featureFlags: flags()});
  assert.equal(duel.startArenaEvent({venueId: 'pit', mode: 'last-car-rolling', car,
    seed: 1989, cpuDifficulty: difficulty, opponents: [{car, brain}]}), true,
    'real Duel entry must admit the implemented Pit');
  duel.state.countdown = 0;
  duel.step(DT);
  assert.equal(duel.state.status, 'racing');
  return duel;
}
function finiteAndContained(duel) {
  for (const actor of [duel.state, ...duel.state.opponents]) {
    assert.ok([actor.s, actor.lateral, actor.headingError, actor.speedMph].every(Number.isFinite));
    assert.ok(Math.abs(actor.lateral) <= 32 + 1e-7, 'native cars stay on the round floor');
  }
}
test('Pit admission: registered native layout needs no public circuit or picker', () => {
  const c = course();
  assert.equal(COURSE.some(row => row.id === 'pit'), false);
  assert.equal(start().state.arena.venueId, 'pit');
  near(c.length, 2 * Math.PI * 40);
});
test('Pit geometry: round centreline, 8–72 m floor and curvature stay physical', () => {
  const c = course(), at = centre(c), layout = c.def.scrapdome;
  assert.equal(layout.floorHalfWidth, 32);
  assert.equal(layout.wallOffset, 35);
  near(venueCurvatureRatio(c), .875, .01);
  assert.ok(venueCurvatureRatio(c) < 1);
  for (let index = 0; index < 32; index++) {
    const s = c.length * index / 32;
    for (const [lateral, radius] of [[-32, 8], [0, 40], [32, 72]]) {
      const point = c.worldAt(s, lateral);
      near(Math.hypot(point.x - at.x, point.z - at.z), radius, .01);
      assert.equal(c.roadHalfWidthAt(s), 32);
    }
  }
});
test('Pit geometry: closing segment projects real poses without a seam jump', () => {
  const c = course();
  for (const s of [0, .01, c.length - 8, c.length - 1, c.length - .01])
    for (const lateral of [-28, 0, 28]) {
      const point = c.worldAt(s, lateral), found = c.nearest(point.x, point.z);
      const wrapped = Math.min(Math.abs(found.s - s), c.length - Math.abs(found.s - s));
      near(wrapped, 0, .01);
      near(found.lateral, lateral, .01);
      const recovered = c.worldAt(found.s, found.lateral);
      near(Math.hypot(recovered.x - point.x, recovered.z - point.z), 0, .01);
    }
});
test('Pit geometry: eight junk cars, opposite ramps and safe opposed starting slots', () => {
  const c = course(), slots = spawnSlots(c);
  assert.equal(c.features.crushables.length, 8);
  assert.equal(c.features.ramps.length, 2);
  const [a, b] = c.features.ramps.map(ramp => (ramp.start + ramp.end) / 2);
  near(Math.abs(b - a), c.length / 2, .01);
  assert.equal(slots.length, 8);
  for (const slot of slots) {
    assert.equal(c.jumpAt(slot.s), 0);
    const point = c.worldAt(slot.s, slot.lateral);
    assert.ok(c.features.crushables.every(junk => Math.hypot(junk.x - point.x, junk.z - point.z) >= c.def.scrapdome.junkSpawnClearance));
  }
  const duel = start(), at = centre(c), poses = [duel.state, ...duel.state.opponents].map(actor => worldPose(duel, actor));
  const va = {x: poses[0].x - at.x, z: poses[0].z - at.z};
  const vb = {x: poses[1].x - at.x, z: poses[1].z - at.z};
  assert.ok((va.x * vb.x + va.z * vb.z) / (Math.hypot(va.x, va.z) * Math.hypot(vb.x, vb.z)) < -.9,
    'a native one-on-one starts across the central pile');
});
for (const difficulty of ['easy', 'medium', 'hard'])
  for (const brain of ['rammer', 'gunner', 'brawler'])
    test(`Pit native recovery: ${brain} on ${difficulty} clears inner and outer approaches`, () => {
      for (const lateral of [-29, 29]) {
        const duel = start({brain, difficulty}), cpu = duel.state.opponents[0];
        placeActor(duel, cpu, {s: 0, lateral, headingError: lateral < 0 ? -Math.PI / 2 : Math.PI / 2});
        placeActor(duel, duel.state, {s: duel.course.length / 2, lateral: 0});
        const origin = worldPose(duel, cpu);
        let furthest = 0;
        for (let tick = 0; tick < 18 * 120; tick++) {
          duel.step(DT); finiteAndContained(duel);
          const pose = worldPose(duel, cpu);
          furthest = Math.max(furthest, Math.hypot(pose.x - origin.x, pose.z - origin.z));
        }
        assert.ok(furthest > 12, 'actual brain and pilot recover instead of staying pinned');
      }
    });
test('Pit native wall and respawn: tangential motion survives and a credited wreck respawns protected', () => {
  const duel = start(), state = duel.state, cpu = state.opponents[0];
  placeActor(duel, state, {s: 30, lateral: 34, headingError: .1}, 35);
  containInArena(duel, state, DT);
  assert.equal(state.lateral, 32);
  assert.ok(state.speedMph > 30, 'glancing wall contact retains tangential travel');
  state.invulnerableSec = 0;
  state.arena.participants.forEach(member => {member.protectedSec = 0;});
  state.armor = 1;
  assert.equal(applyArmorDamage(duel, state, 'crossbow', {owner: cpu.arenaId}), 1);
  state.combatWreckTimer = DT;
  duel.step(DT);
  assert.equal(state.combatWrecking, false);
  assert.equal(state.arena.participants[0].protectedSec, 2);
  finiteAndContained(duel);
});
test('Pit control: released ring physical geometry and native eight-second trace remain exact', () => {
  const expected = JSON.parse(readFileSync(new URL('./replays/salt-flats-controls.json', import.meta.url))).scrapdome;
  const c = new Course(SCRAPDOME_VENUE, 1989);
  assert.equal(hash(JSON.stringify({venue: SCRAPDOME_VENUE, samples: c.samples,
    features: c.features, spawns: spawnSlots(c)})), expected.physicalSha256);
  const duel = new Duel({seed: 1989, featureFlags: flags()});
  assert.equal(duel.startArenaEvent({car: 'falcone_f42', seed: 1989, cpuDifficulty: 'medium',
    opponents: [{car: 'dusthawk_rally'}]}), true);
  const trace = [];
  for (let tick = 0; tick < 8 * 120; tick++) {
    duel.setInput({throttle: .75, brake: 0, steer: .08, boost: false}); duel.step(DT);
    if (tick % 120 === 119) trace.push({status: duel.state.status, phase: duel.state.arena.phase,
      clock: duel.state.arena.clockSec, actors: [duel.state, ...duel.state.opponents].map(actor =>
        ({s: actor.s, lateral: actor.lateral, speed: actor.speedMph, heading: actor.headingError,
          armor: actor.armor, airborne: actor.airborne})), participants: duel.state.arena.participants.map(row =>
        ({id: row.id, wrecks: row.wrecks, wrecked: row.wrecked}))});
  }
  assert.equal(hash(JSON.stringify(trace)), expected.traceSha256);
  assert.equal(hash(readFileSync(new URL('./replays/expected-fingerprints.json', import.meta.url))), expected.ordinaryReplayFileSha256);
});
