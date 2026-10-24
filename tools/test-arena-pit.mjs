import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Course} from '../src/course.js';
import {Duel} from '../src/game.js';
import {CARS, COURSE, DRIVE} from '../src/config.js';
import {ARENA_VENUES, SCRAPDOME_VENUE, spawnSlots, venueCurvatureRatio} from '../src/arena/venues.js';
import {placeActor} from '../src/arena/arena-event.js';
import {worldPose, containInArena} from '../src/arena/arena-floor.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {startWarlordEvent} from '../src/arena/warlord-event.js';
import {warlordIntroScreen} from '../src/screen-arena.js';

// SCRAPDOME 2: real Course and native Duel paths. No substitute working Pit.
const DT = 1 / 120;
// Arsenal (released 4 October 2026) is pinned off: the Pit controls keep the earlier ring traces.
const flags = () => createFeatureFlags({storage: null, qa: true, search: '?flags=salt-flats', overrides: {arsenal: false}});
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
  duel.state.wastelandGateDiscovered = true;
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
test('Twin Vultures start in the Pit, while the existing warlord stays on the ring', () => {
  const intro = duel => warlordIntroScreen(duel.state,
    {metric: () => '', action: () => '', escapeHTML: value => value});
  const pair = new Duel({seed: 1989, featureFlags: flags()});
  pair.state.wastelandGateDiscovered = true;
  assert.equal(startWarlordEvent(pair, {warlordId: 'vultures', car: 'falcone_f42', seed: 1989}), true);
  assert.equal(pair.state.arena.venueId, 'pit');
  assert.match(intro(pair).eyebrow, /THE PIT/);
  const ring = new Duel({seed: 1989, featureFlags: flags()});
  ring.state.wastelandGateDiscovered = true;
  assert.equal(startWarlordEvent(ring, {warlordId: 'sal', car: 'falcone_f42', seed: 1989}), true);
  assert.equal(ring.state.arena.venueId, 'scrapdome');
  assert.match(intro(ring).eyebrow, /SCRAPDOME/);
});
test('Pit geometry: round centreline, 8–72 m floor and curvature stay physical', () => {
  const c = course(), at = centre(c), layout = c.def.scrapdome;
  assert.equal(layout.floorHalfWidth, 32);
  // SCRAPDOME-TANKER-FIX (11 October 2026): the wall was 35 m out (ratio .875), 1 m behind the
  // drawn wall and 1.5 m from a car at the floor edge; it now stands at the drawn face, 34 m.
  assert.equal(layout.wallOffset, 34);
  near(venueCurvatureRatio(c), .85, .01);
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
test('Pit geometry: the only fixed interior obstacle is the solid eight-metre centre pile', () => {
  const c = course(), at = centre(c);
  const inside = c.features.obstacles.filter(item => Math.hypot(item.x - at.x, item.z - at.z) < 72);
  assert.equal(inside.length, 1, 'no ring-shaped inner barrier or interior scenery collision remains');
  const pile = inside[0];
  near(Math.hypot(pile.x - at.x, pile.z - at.z), 0, .01);
  near(pile.halfX, 8); near(pile.halfZ, 8);
  assert.equal(pile.shape, 'ellipse', 'the physical centre pile is solid and round');
});
for (const car of Object.keys(CARS))
  test(`Pit reachable floor: ${car} uses native physics to reach inner, middle and outer samples`, () => {
    for (const lateral of [-22, 0, 22]) {
      const duel = start({car, difficulty: 'easy'}), cpu = duel.state.opponents[0];
      const s = duel.course.length * .3, goal = duel.course.worldAt(s, lateral);
      placeActor(duel, cpu, {s: s - 20, lateral: 0});
      placeActor(duel, duel.state, {s: duel.course.length * .8, lateral: 0});
      const participant = duel.state.arena.participants[1];
      Object.assign(participant, {targetId: 'player', reactionSec: Infinity,
        goal: {...goal, speedMph: 30, boost: false}});
      const cachedGoal = participant.goal;
      let closest = Infinity;
      for (let tick = 0; tick < 30 * 120; tick++) {
        duel.step(DT); finiteAndContained(duel);
        if (tick === 0) assert.equal(participant.goal, cachedGoal,
          'the actual enemy target preserves this native cached pilot goal');
        const at = worldPose(duel, cpu);
        closest = Math.min(closest, Math.hypot(at.x - goal.x, at.z - goal.z));
        if (closest < 3.5) break;
      }
      assert.ok(closest < 3.5, 'the native car reaches the sampled safe floor without teleport or altered limits');
    }
  });
test('Pit native junk: ordinary ram moves cover and Titan alone crushes it', () => {
  for (const car of ['falcone_f42', 'titan_monster']) {
    const duel = start({car}), actor = duel.state, props = duel.course.features.crushables;
    const prop = props[0], at = duel.course.groundAt(duel.course.length * .3, 0);
    Object.assign(prop, at, {s: duel.course.length * .3, lateral: 0, off: 0, headingError: 0,
      prevS: duel.course.length * .3, prevLateral: 0, speedMph: 0, knock: null});
    const spec = duel._vehicleSpec(actor), forward = {x: Math.sin(prop.heading), z: Math.cos(prop.heading)};
    const gap = spec.halfLength + prop.halfZ + .025;
    const before = {x: prop.x, z: prop.z};
    const from = duel.course.nearest(prop.x - forward.x * gap, prop.z - forward.z * gap, prop.s);
    const to = duel.course.nearest(prop.x - forward.x * gap + forward.x * 60 * DRIVE.mphToWorld * DT,
      prop.z - forward.z * gap + forward.z * 60 * DRIVE.mphToWorld * DT, prop.s);
    placeActor(duel, actor, {...to, headingError: prop.heading - duel.course.at(to.s).heading}, 60);
    actor.prevS = from.s; actor.prevLateral = from.lateral;
    duel._crushProps(actor);
    if (car === 'titan_monster') assert.ok(duel.state.crushedProps.includes(prop.id), 'Titan native crushing keeps the released rule');
    else {
      assert.ok(prop.knock?.arenaShove, 'ordinary car dispatches the native contact shove');
      assert.equal(duel.state.crushedProps.includes(prop.id), false, 'ordinary car cannot crush junk');
      placeActor(duel, actor, {s: 20, lateral: 0});
      for (let tick = 0; tick < 120; tick++) duel.step(DT);
      assert.ok(Math.hypot(prop.x - before.x, prop.z - before.z) > .1, 'native time steps move the contacted cover');
      assert.ok(Math.abs(prop.lateral) <= 32 + 1e-7, 'cover remains on the round floor');
    }
  }
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
  duel.state.wastelandGateDiscovered = true;
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
  // Ordinary race fingerprints are checked by test-replays itself, not by a hash of its file.
});
