import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { Duel } from '../src/game.js';
import { DRIVE } from '../src/config.js';
import { ROUTE_VARIANTS } from '../src/route-variants.js';
import { SEA_LEVEL } from '../src/coastal-water.js';
import { buildDeepRamp } from '../src/deep/deep-ramp.js';
import { defineZone } from '../src/deep/deep-zone.js';
import { kelpCoastProvider } from '../src/deep/zones/kelp-coast.js';

const DT = 1 / 120;
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const length = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);

// A Pacific Canyon race on one of the three audited routes, with the real provider.
function race(route, { providers = [kelpCoastProvider], enabled = true } = {}) {
  const duel = new Duel({ seed: route.seed, deepProviders: providers, featureFlags: { 'the-deep': enabled } });
  duel.startCampaign({ seed: route.seed, car: 'falcone_f42', mode: 'duel', deepKit: true, opponentCount: 1,
    fieldSize: 2, fieldSeed: route.seed, playerId: 'node-qa' });
  Object.assign(duel.state, { status: 'racing', countdown: 0 });
  return duel;
}
function zoneFor(route) {
  // DEEP-RAMP-2: audit the installed cutting as well as natural terrain beyond it.
  const duel = race(route);
  const ramp = duel.course.deepRamp;
  assert.ok(ramp, `${route.id} has a Deep ramp`);
  return { duel, ramp, zone: defineZone(kelpCoastProvider(ramp)) };
}
const loop = trail => trail.map((a, i) => ({ a, b: trail[(i + 1) % trail.length] }));
const trailLength = trail => loop(trail).reduce((sum, { a, b }) => sum + length(a, b), 0);
function circumradius(a, b, c) {
  const cross = Math.abs((b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x));
  return length(a, b) * length(b, c) * length(a, c) / (2 * cross || 1e-12);
}
function place(zone, id) { return zone.places.find(row => row.id === id); }
function indicesOf(zone, row) {   // a place may wrap past the end of the trail
  const n = zone.trail.length, out = [];
  for (let i = row.fromIndex; ; i = (i + 1) % n) { out.push(i); if (i === row.toIndex) break; }
  return out;
}

test('the Kelp Coast loads on every route and matches its resolved ramp', () => {
  for (const route of ROUTE_VARIANTS) {
    const { ramp, zone } = zoneFor(route), end = ramp.points.at(-1), first = zone.trail[0];
    assert.equal(zone.id, 'kelp-coast');
    assert.equal(zone.circuit, 'pacific-canyon');
    assert.equal(zone.switch, 'the-deep');
    assert.deepEqual(zone.ramp, { atDistance: ramp.atDistance, side: ramp.side, length: 120, endDepth: 8 });
    assert.ok(length(first, end) < 1e-6 && first.depth === 8, 'the first trail point is the foot of the ramp');
    assert.deepEqual(zone.places.map(row => row.name), ['Ramp Shallows', 'The Kelp Forest', 'The Drop-off']);
  }
});

test('loop length, widths, depths and bends are in range', () => {
  for (const route of ROUTE_VARIANTS) {
    const { zone } = zoneFor(route), trail = zone.trail, n = trail.length;
    const total = trailLength(trail);
    assert.ok(total >= 3000 && total <= 4000, `${route.id}: loop is ${total.toFixed(0)} m`);
    // The foot of the ramp is a 6 m cove, so the trail starts there at that width.
    assert.equal(trail[0].width, 6);
    for (let i = 1; i < n; i++) assert.ok(trail[i].width >= 14 && trail[i].width <= 20, `width ${trail[i].width} at ${i}`);
    for (let i = 0; i < n; i++) {
      const radius = circumradius(trail[(i + n - 1) % n], trail[i], trail[(i + 1) % n]);
      assert.ok(radius >= 25, `${route.id}: bend at ${i} has radius ${radius.toFixed(1)} m`);
      // The one long segment is the spur that closes the loop into the foot of the ramp.
      if (i < n - 1) assert.ok(length(trail[i], trail[i + 1]) <= 12, 'trail points stay close enough to read as a smooth line');
    }
    const range = row => { const d = indicesOf(zone, row).map(i => trail[i].depth); return [Math.min(...d), Math.max(...d)]; };
    const [shallowMin, shallowMax] = range(place(zone, 'ramp-shallows'));
    const [forestMin, forestMax] = range(place(zone, 'kelp-forest'));
    const [dropMin, dropMax] = range(place(zone, 'drop-off'));
    // The gullies sit inside these ranges, so the numbers include them.
    assert.ok(shallowMin >= 5 && shallowMax <= 10, `shallows ${shallowMin}-${shallowMax} m`);
    assert.ok(forestMin >= 10 && forestMax <= 20, `forest ${forestMin}-${forestMax} m`);
    assert.ok(dropMin >= 20 && dropMax <= 26, `drop-off ${dropMin}-${dropMax} m`);
    const lip = indicesOf(zone, place(zone, 'drop-off')).map(i => trail[i]);
    assert.ok(lip.every(point => point.rock >= .8), 'the lip is rock');
    assert.ok(indicesOf(zone, place(zone, 'kelp-forest')).every(i => trail[i].kelp >= .9), 'the forest is kelp');
  }
});

test('two gullies, one in the shallows and one in the forest, 25 to 40 m long and about 3 m deeper', () => {
  const { zone } = zoneFor(ROUTE_VARIANTS[0]), trail = zone.trail, n = trail.length;
  const steps = trail.map((point, i) => trail[(i + 1) % n].depth - point.depth);
  const entries = steps.flatMap((step, i) => step >= 2.5 ? [i + 1] : []);
  const exits = steps.flatMap((step, i) => step <= -2.5 ? [i] : []);
  assert.equal(entries.length, 2, 'two lips going down');
  assert.equal(exits.length, 2, 'two lips coming up');
  const where = [];
  entries.forEach((entry, k) => {
    let run = 0;
    for (let i = entry; i < exits[k]; i++) run += length(trail[i], trail[i + 1]);
    assert.ok(run >= 25 && run <= 40, `gully ${k} is ${run.toFixed(0)} m long`);
    where.push(['ramp-shallows', 'kelp-forest'].find(id => indicesOf(zone, place(zone, id)).includes(entry)));
  });
  assert.deepEqual(where, ['ramp-shallows', 'kelp-forest']);
});

test('every trail point passes the dry-terrain check on every route', () => {
  for (const route of ROUTE_VARIANTS) {
    const { duel, zone } = zoneFor(route), course = duel.course;
    let checked = 0;
    for (const { a, b } of loop(zone.trail)) {
      const run = length(a, b), steps = Math.max(1, Math.ceil(run / 4)), tx = (b.x - a.x) / run, tz = (b.z - a.z) / run;
      for (let k = 0; k < steps; k++) {
        const t = k / steps, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
        const reach = (a.width + (b.width - a.width) * t) / 2 + 3;
        for (const side of [-reach, 0, reach]) {
          const near = course.nearest(x + tz * side, z - tx * side), ground = course.groundAt(near.s, near.lateral).y;
          assert.ok(ground < SEA_LEVEL - .5, `${route.id}: land at ${x.toFixed(0)}, ${z.toFixed(0)} (${(ground - SEA_LEVEL).toFixed(1)} m)`);
          checked++;
        }
      }
    }
    assert.ok(checked > 1000);
  }
});

test('pearls, creature spots and finds have the ids, places and positions of the story', () => {
  for (const route of ROUTE_VARIANTS) {
    const { zone } = zoneFor(route), trail = zone.trail;
    const inPlace = (id, trailIndex) => indicesOf(zone, place(zone, id)).includes(trailIndex);
    assert.deepEqual(zone.pearls.map(row => row.id), ['kelp-1', 'kelp-2', 'kelp-3']);
    assert.ok(inPlace('ramp-shallows', zone.pearls[0].trailIndex));
    assert.ok(inPlace('kelp-forest', zone.pearls[1].trailIndex));
    assert.ok(inPlace('drop-off', zone.pearls[2].trailIndex), 'kelp-3 is on a rock at the Drop-off lip');
    assert.ok(Math.abs(zone.pearls[2].offset) >= trail[zone.pearls[2].trailIndex].width / 2 - 3, 'kelp-3 sits at the lip');
    for (const pearl of zone.pearls) assert.ok(Math.abs(pearl.offset) < trail[pearl.trailIndex].width / 2, `${pearl.id} is on the trail`);

    assert.deepEqual(zone.spots.map(row => row.creature).sort(),
      ['crab', 'otter', 'ray', 'sea-lion', 'silver-school', 'turtle', 'whale'], 'the seven Kelp Coast creatures');
    const spotPlace = creature => ['ramp-shallows', 'kelp-forest', 'drop-off']
      .find(id => inPlace(id, zone.spots.find(row => row.creature === creature).trailIndex));
    assert.deepEqual(['turtle', 'ray', 'crab', 'silver-school', 'sea-lion', 'otter', 'whale'].map(spotPlace),
      ['ramp-shallows', 'ramp-shallows', 'ramp-shallows', 'kelp-forest', 'kelp-forest', 'kelp-forest', 'drop-off']);

    assert.deepEqual(zone.finds.map(row => row.id), ['sirena-badge', 'sirena-steering-wheel', 'sirena-wheel',
      'sirena-bonnet', 'sirena-door', 'sirena-car'], 'finds in story order');
    const find = id => zone.finds.find(row => row.id === id);
    const foot = trail[0], at = row => trail[row.trailIndex];
    assert.ok(length(at(find('sirena-badge')), foot) <= 40, 'the badge is within 40 m of the ramp foot');
    assert.ok(inPlace('ramp-shallows', find('sirena-badge').trailIndex));
    assert.ok(inPlace('kelp-forest', find('sirena-steering-wheel').trailIndex) && inPlace('kelp-forest', find('sirena-wheel').trailIndex));
    assert.ok(inPlace('kelp-forest', find('sirena-bonnet').trailIndex), 'the bonnet is at the forest edge');
    assert.ok(find('sirena-bonnet').trailIndex >= place(zone, 'drop-off').fromIndex - 10, 'the forest edge is next to the lip');
    assert.ok(inPlace('drop-off', find('sirena-door').trailIndex));
    assert.ok(inPlace('drop-off', find('sirena-car').trailIndex));
    assert.equal(find('sirena-car').below, 3, 'the Sirena is on a ledge 3 m below the lip');
    assert.ok(zone.finds.filter(row => row.id !== 'sirena-car').every(row => row.below === 0));
    // Finds are found one at a time: the nearest is never closer than the sonar can tell apart.
    const spots = zone.finds.map(row => at(row));
    for (let i = 0; i < spots.length; i++) for (let j = i + 1; j < spots.length; j++)
      assert.ok(length(spots[i], spots[j]) > 20, `${zone.finds[i].id} and ${zone.finds[j].id} are apart`);
  }
});

test('the main game passes the Kelp Coast provider to the App', async () => {
  const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(source, /import \{kelpCoastProvider\} from '\.\/deep\/zones\/kelp-coast\.js'/);
  assert.match(source, /new App\(\{deepProviders:\[kelpCoastProvider\]\}\)/);
});

test('with the switch off or the ramp unused, Pacific Canyon runs exactly as without the provider', () => {
  for (const route of ROUTE_VARIANTS) {
    const ordinary = race(route, { providers: [], enabled: false });
    const off = race(route, { enabled: false });
    const unused = race(route);
    assert.equal(off.course.deepRamp, undefined);
    assert.equal(off.course.deepProviderProblem, undefined);
    assert.ok(unused.course.deepRamp && unused.course.deepZone.zone.id === 'kelp-coast');
    for (const duel of [ordinary, off, unused]) duel.setInput({ throttle: .4, steer: .08 });
    for (let i = 0; i < 240; i++) for (const duel of [ordinary, off, unused]) duel.step(DT);
    assert.equal(JSON.stringify(off.state), JSON.stringify(ordinary.state));
    assert.equal(JSON.stringify(unused.state), JSON.stringify(ordinary.state));
  }
});

// ---- a real dive -------------------------------------------------------------------

function rampPoint(ramp, progress) {
  for (let i = 1; i < ramp.points.length; i++) {
    const a = ramp.points[i - 1], b = ramp.points[i];
    if (progress > b.progress && i < ramp.points.length - 1) continue;
    const t = (progress - a.progress) / (b.progress - a.progress);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
  }
}
function dive(duel) {
  const ramp = duel.course.deepRamp, point = rampPoint(ramp, ramp.shoreline.center.progress - .04);
  const near = duel.course.nearest(point.x, point.z), frame = duel.course.at(near.s);
  Object.assign(duel.state, { s: near.s, prevS: near.s, lateral: near.lateral, prevLateral: near.lateral,
    headingError: wrap(ramp.heading - frame.heading), speedMph: 35, groundHeight: point.y, airHeight: 0,
    prevAirHeight: 0, airborne: false, impactTimer: 0, yawVelocity: 0, steerVisual: 0, slipAngle: 0,
    pushVelocity: 0, _jumpY: null });
  duel.setInput({ throttle: 0, brake: 0, steer: 0, boost: false });
  duel.step(DT);
  assert.equal(duel.state.deepJourney?.phase, 'choice');
  assert.equal(duel.chooseDeep('dive'), true);
  for (let i = 0; i < 3 * 120; i++) duel.step(DT);
  assert.equal(duel.state.deepJourney.phase, 'underwater');
  return ramp;
}

test('the journey dives into kelp-coast, drives the whole loop on the sea floor and climbs back up the ramp', () => {
  for (const route of ROUTE_VARIANTS) {
    const duel = race(route), events = [];
    duel.onChange((state, event) => { if (event.deepEntered) events.push('deepEntered'); if (event.deepExited) events.push('deepExited'); });
    const raceCourse = duel.course;
    dive(duel);
    const course = duel.course, state = duel.state;
    assert.equal(course.def.id, 'kelp-coast');
    assert.equal(course.length, trailLength(raceCourse.deepZone.zone.trail), 'the zone course is the trail');
    // A Node drive on the sea-floor surface: follow the trail at 40 mph, as a player would.
    const target = 40;
    let maxLateral = 0, maxS = 0, steps = 0;
    while (state.deepJourney?.phase === 'underwater' && steps < 120 * 260) {
      const speed = Math.max(0, state.speedMph) * DRIVE.mphToWorld, ahead = Math.max(14, speed * .8);
      const bend = wrap(course.at(state.s + ahead).heading - course.at(state.s).heading) / ahead;
      const aim = Math.atan(-state.lateral * 2.5 / Math.max(10, speed));
      const yaw = bend * speed + (aim - state.headingError) * 6;
      const gain = Math.max(.05, DRIVE.yawRate * Math.min(1, speed / 13.4) * .8);
      duel.setInput({ throttle: state.speedMph < target ? 1 : 0, brake: state.speedMph > target + 8 ? .5 : 0,
        steer: Math.max(-1, Math.min(1, -yaw / gain)), boost: false });
      duel.step(DT);
      steps++;
      if (state.deepJourney?.phase === 'underwater') {
        maxLateral = Math.max(maxLateral, Math.abs(state.lateral) - course.roadHalfWidthAt(state.s));
        maxS = Math.max(maxS, state.s);
      }
    }
    assert.ok(maxLateral <= 0, `${route.id}: left the trail by ${maxLateral.toFixed(1)} m`);
    assert.ok(maxS >= course.length - 20, `${route.id}: reached ${maxS.toFixed(0)} of ${course.length.toFixed(0)} m`);
    assert.equal(state.deepJourney, undefined, 'the drive back up the ramp ends the dive');
    assert.equal(duel.course, raceCourse, 'back on Pacific Canyon');
    assert.deepEqual(events, ['deepEntered', 'deepExited'], 'one dive in, one way back out');
  }
});
