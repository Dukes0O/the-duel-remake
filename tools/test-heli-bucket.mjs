// The water bucket (docs/HELI_FIRE.md sections 5 and 6): scooping from a
// lake by depth and speed, mass that follows the water, pouring in parcels,
// where the water lands, the aim ring, damage and leaks, a light bucket on
// the cable, and the same results from the same inputs.
import assert from 'node:assert/strict';
import {HELI_STEP, createHeliState, stepHeli, heliFingerprint} from '../src/heli/heli-flight.js';
import {flatGround, createHeliGround, groundFromCourse, courseWater} from '../src/heli/heli-ground.js';
import {CABLE, createLoad, hook, release, stepCable} from '../src/heli/heli-cable.js';
import {
  BUCKET, DROP_AIM_RINGS, HIT_DAMAGE, createBucket, stepBucket, setBucketWater, bucketWords, bucketHolds, bucketHit,
  damageBucket, keptShare, wetRadius, aimPoint, aimLocked, aimRingRadius,
} from '../src/heli/heli-bucket.js';
import {Course} from '../src/course.js';
import {TREMBLANT_WOODS} from '../src/circuits/tremblant-woods.js';
import {TREMBLANT_SNOW} from '../src/circuits/tremblant-snow.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const near = (actual, expected, tolerance, label) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} not within ${tolerance} of ${expected}`);
  checks++;
};
const eq = (actual, expected, label) => { assert.equal(actual, expected, label); checks++; };
const types = events => events.map(event => event.type);

// A flat world with a pond 200 m square whose surface is at 100 m.
const POND = 100;
const pond = createHeliGround({heightAt: () => POND - 5, water: (x, z) => Math.abs(x) <= 100 && Math.abs(z) <= 100 ? POND : null});
const flat = flatGround(0);

// A bucket held still in the air with its bottom `depth` metres under the pond.
function held(depth, {speed = 0, damage = 0, water = 0} = {}) {
  const bucket = createBucket({damage, x: 0, z: 0, ground: pond});
  Object.assign(bucket, {onGround: false, y: POND - depth + BUCKET.hang, vz: speed});
  setBucketWater(bucket, water);
  return bucket;
}
function hold(bucket, seconds, env = {}, {keepSpeed = null} = {}) {
  const events = [], patches = [];
  for (let i = 0; i < Math.round(seconds / HELI_STEP); i++) {
    if (keepSpeed !== null) bucket.vz = keepSpeed;
    const out = stepBucket(bucket, {ground: pond, ...env});
    events.push(...out.events); patches.push(...out.patches);
  }
  return {events, patches};
}
// A bucket with its bottom `height` metres above flat ground, with some water.
function aloft(height, water = 600, speed = 0) {
  const bucket = createBucket({ground: flat});
  Object.assign(bucket, {onGround: false, y: height + BUCKET.hang, vz: speed});
  setBucketWater(bucket, water);
  return bucket;
}
const filledIn = (depth, speed, seconds = 1) => { const b = held(depth, {speed}); hold(b, seconds, {}, {keepSpeed: speed}); return b.water / seconds; };

// The numbers.
eq(BUCKET.litres, 600, 'a 600 litre bucket');
eq(BUCKET.emptyKg, 50, 'the empty bucket weighs 50 kg');
eq(BUCKET.hang, 3.8, 'the bottom hangs 3.8 m below the hook (2.5 m rigging, 1.3 m body)');
eq(BUCKET.pourRate, 400, 'pours at 400 litres a second');
eq(BUCKET.parcelLitres, 25, 'in parcels of 25 litres');
eq(BUCKET.fallSpeed, 9, 'water falls at 9 m/s at most');
assert.deepEqual([...DROP_AIM_RINGS], [12, 8, 5, 0]); checks++;
assert.deepEqual([...BUCKET.holds], [600, 450, 300, 0]); checks++;
assert.deepEqual([...BUCKET.leaks], [0, 3, 8, 0]); checks++;

// A fresh bucket: on the hook, the ring 3.8 m up so the body rests on the ground, empty.
{
  const bucket = createBucket({x: 5, z: 6, ground: flat});
  ok(bucket.hooked && bucket.onGround && bucket.bucket, 'a fitted bucket is on the hook and resting');
  near(bucket.y, 3.8, 1e-9, 'its ring rides 3.8 m above the ground');
  near(bucket.massKg, 50, 1e-9, 'it weighs 50 kg empty');
  eq(bucket.restHeight, BUCKET.hang, 'its rest height is its own');
  eq(bucketWords(bucket), 'empty', 'and reads empty');
}

// The cable: a load without its own rest height is exactly as before.
{
  const car = createLoad({id: 'car', massKg: 1300, ground: flat});
  eq(car.y, CABLE.restHeight, 'a car rests 0.7 m up');
  ok(!Object.hasOwn(car, 'restHeight'), 'and carries no rest height of its own');
  const crate = createLoad({id: 'crate', massKg: 500, ground: flat, restHeight: 2});
  near(crate.y, 2, 1e-9, 'a load with its own rest height rests there');
  // Released on the ground: no drop, and held at its own rest height afterwards.
  crate.hooked = true; crate.onGround = true;
  const event = release(crate, flat);
  eq(event.event.type, 'released', 'letting go of a load resting at its own height is a clean release');
  const high = createLoad({id: 'crate', massKg: 500, ground: flat, restHeight: 2});
  high.hooked = true; high.onGround = false; high.y = 5;
  near(release(high, flat).event.heightM, 3, 1e-9, 'a drop is measured from the load\'s own rest height');
  const heli = createHeliState({ground: flat, y: 40});
  const sitter = createLoad({id: 'crate', massKg: 500, ground: flat, restHeight: 2});
  sitter.onGround = false; sitter.falling = true; sitter.y = 6;
  for (let i = 0; i < 240; i++) stepCable(sitter, heli, {ground: flat});
  ok(sitter.onGround, 'a dropped load lands');
  near(sitter.y, 2, 1e-9, 'and comes to rest at its own height, not 0.7 m');
}

// The water query on the ground.
{
  eq(flat.water(0, 0), null, 'flat ground has no water');
  eq(createHeliGround({heightAt: () => 0}).water(3, 4), null, 'a ground made without water returns null');
  eq(pond.water(10, 10), POND, 'the pond reports its surface');
  eq(pond.water(150, 0), null, 'and none beyond its shore');
  const bad = createHeliGround({heightAt: () => 0, water: () => undefined});
  eq(bad.water(0, 0), null, 'a water query that returns nothing reads as null');
}

// Tremblant Woods' real lake.
const course = new Course(TREMBLANT_WOODS, 1989);
const lake = course.def.basins[0];
const lakeGround = groundFromCourse(course);
const surface = course._height(lake.s) + lake.surface;
{
  const centre = course.worldAt(course.phase(lake.s), lake.lateral);
  near(lakeGround.water(centre.x, centre.z), surface, 1e-9, 'the lake reports its surface at the middle');
  ok(lakeGround.height(centre.x, centre.z) < surface - 2, 'with the lake bed below it');
  const inside = course.worldAt(lake.s + lake.along * 0.5, lake.lateral + lake.across * 0.3);
  near(lakeGround.water(inside.x, inside.z) ?? NaN, surface, 1e-9, 'and inside its outline');
  const road = course.worldAt(lake.s, 0);
  eq(lakeGround.water(road.x, road.z), null, 'no water on the road');
  const start = course.groundAt(0, 0);
  eq(lakeGround.water(start.x, start.z), null, 'no water on the start line');
  const far = course.worldAt(lake.s, lake.lateral + lake.across * 1.35);
  eq(lakeGround.water(far.x, far.z), null, 'no water on the far shore');
  const end = course.worldAt(lake.s + lake.along * 1.3, lake.lateral);
  eq(lakeGround.water(end.x, end.z), null, 'no water past the end of the lake');
  const between = course.worldAt(lake.s, lake.lateral - lake.across * 1.35);
  eq(lakeGround.water(between.x, between.z), null, 'no water between the lake and the road');
}

// A lake across the start line is found from both sides of the lap.
{
  const stub = {
    def: {basins: [{s: 20, lateral: 0, along: 50, across: 50, surface: -1, depth: 3}]},
    closed: true, length: 1000, phase: s => ((s % 1000) + 1000) % 1000, _height: () => 5,
    nearest: (x, z) => ({s: x < 0 ? 1000 + x : x, lateral: z}),
  };
  const water = courseWater(stub);
  eq(water(30, 0), 4, 'a lake just past the start line');
  eq(water(-20, 0), 4, 'and just before it, across the lap wrap');
  eq(water(-200, 0), null, 'but not far before it');
  eq(courseWater({def: {}, closed: true})(0, 0), null, 'a course without basins has no water');
  const open = {...stub, closed: false, phase: s => Math.min(1000, Math.max(0, s))};
  eq(courseWater(open)(-20, 0), null, 'an open course does not wrap');
}

// Filling: by depth, then by speed.
{
  near(filledIn(1.0, 0), 100, 0.2, 'a full dip at 1 m deep fills at 100 L/s');
  near(filledIn(2.5, 0), 100, 0.2, 'deeper does not fill faster');
  near(filledIn(0.5, 0), 50, 0.2, 'half a metre deep fills at half rate');
  near(filledIn(0.3, 0), 30, 0.2, 'at 0.3 m it just fills, at 30 L/s');
  near(filledIn(0.29, 0), 0, 1e-9, 'under 0.3 m it does not fill');
  near(filledIn(-0.5, 0), 0, 1e-9, 'out of the water it does not fill');
  near(filledIn(1, 3), 100, 0.2, 'at 3 m/s: full rate');
  near(filledIn(1, 5), 100, 0.2, 'at 5 m/s: still full rate');
  near(filledIn(1, 7), 50, 0.5, 'at 7 m/s: half rate');
  near(filledIn(1, 10), 50, 0.5, 'at 10 m/s: still half rate');
  near(filledIn(1, 12), 0, 1e-9, 'over 10 m/s: no filling');
  eq(held(1).filling, 0, 'a bucket that has not stepped reports no filling');
  const b = held(1); hold(b, 0.1);
  near(b.filling, 100, 1e-9, 'and one that is filling reports the rate');
  const dry = createBucket({ground: flat}); stepBucket(dry, {ground: flat});
  eq(dry.filling, 0, 'a bucket on a ground with no lake never fills');
}

// Dragging through the water.
{
  const b = held(1, {speed: 7, water: 100}); const m = b.massKg;
  stepBucket(b, {ground: pond});
  near(7 - b.vz, 2000 * 7 / m * HELI_STEP, 1e-9, 'the water drags a 7 m/s bucket back at 2,000 N per m/s');
  const c = held(1, {speed: 4, water: 100});
  stepBucket(c, {ground: pond});
  eq(c.vz, 4, 'at 5 m/s or less the water does not drag');
  const d = held(1, {speed: 60, water: 100}); const md = d.massKg;
  stepBucket(d, {ground: pond});
  near(60 - d.vz, CABLE.maxTension / md * HELI_STEP, 1e-6, 'the drag is capped at the cable limit');
  const out = held(-1, {speed: 7, water: 100});
  stepBucket(out, {ground: pond});
  eq(out.vz, 7, 'no drag out of the water');
}

// Mass follows the water.
{
  const b = held(1);
  near(b.massKg, 50, 1e-9, 'empty: 50 kg');
  hold(b, 3);
  near(b.water, 300, 0.3, 'three seconds of dipping: 300 L');
  near(b.massKg, 50 + b.water, 1e-9, 'the mass is 50 kg plus the water');
  hold(b, 4);
  near(b.water, 600, 1e-9, 'a dip stops at 600 L');
  near(b.massKg, 650, 1e-9, 'and the full bucket weighs 650 kg');
  ok(b.massKg <= 1500, 'well inside the hook limit');
  hold(b, 0.2, {pour: true});
  near(b.massKg, 50 + b.water, 1e-9, 'pouring lightens it');
  ok(b.massKg < 650, 'by the litres let go');
}

// A full dip at Tremblant Woods' real lake, hanging from a helicopter on the cable.
function dipLake(above, seconds = 12) {
  const centre = course.worldAt(course.phase(lake.s), lake.lateral);
  const heli = {x: centre.x, y: surface + above, z: centre.z, vx: 0, vy: 0, vz: 0};
  const bucket = createBucket({x: centre.x, z: centre.z, ground: lakeGround});
  Object.assign(bucket, {onGround: false, y: heli.y - CABLE.length});
  let full = null;
  for (let n = 0; n < Math.round(seconds / HELI_STEP); n++) {
    stepBucket(bucket, {ground: lakeGround});
    stepCable(bucket, heli, {ground: lakeGround});
    if (full === null && bucket.water >= 599.99) full = (n + 1) * HELI_STEP;
  }
  return {bucket, full, depth: surface - (bucket.y - BUCKET.hang)};
}
{
  const dip = dipLake(17.8);
  near(dip.depth, 1.0, 0.05, 'a helicopter 17.8 m above the lake puts the bucket 1 m under');
  near(dip.full, 6, 0.3, 'and a full dip fills in about 6 seconds');
  const shallow = dipLake(18.3);
  near(shallow.full, 12, 0.6, 'half a metre under takes about 12 seconds');
  const high = dipLake(19);
  near(high.bucket.water, 0, 1e-9, 'at 19 m above the water the bucket does not reach');
}

// Pouring: 400 L/s in parcels of 25.
{
  const b = aloft(20);
  const first = hold(b, 0.5, {pour: true, ground: flat});
  near(b.water, 400, 0.5, 'half a second of pouring lets 200 L go');
  hold(b, 1.0, {pour: true, ground: flat});
  near(b.water, 0, 1e-6, 'a full bucket is empty in 1.5 seconds');
  ok(types(first.events).includes('pourStart'), 'pourStart is announced');
  eq(types(first.events).filter(t => t === 'pourStart').length, 1, 'once');
}
{
  const b = aloft(20);
  const out = hold(b, 1.6, {pour: true, ground: flat});
  ok(out.events.some(e => e.type === 'pourStop'), 'running dry stops the pour');
  eq(bucketWords(b), 'empty', 'and the bucket reads empty');
  eq(b.parcels.length, 24, '600 L left as 24 parcels (still falling)');
  near(b.parcels.reduce((a, p) => a + p.litres, 0), 600, 1e-6, 'carrying all 600 L');
  ok(b.parcels.every(p => Math.abs(p.litres - 25) < 1e-6), 'each a full 25 L');
  // Parcels start at the bucket's bottom with its speed.
  const m = aloft(20, 600, 12);
  for (let i = 0; i < 8; i++) stepBucket(m, {ground: flat, pour: true});
  const parcel = m.parcels[0];
  ok(parcel, 'a parcel is in the air after 8 steps (25 L at 400 L/s)');
  near(parcel.from, m.y - BUCKET.hang, 1e-9, 'it started at the bucket\'s bottom');
  ok(parcel.vz > 11 && parcel.vz <= 12, 'moving with the bucket, slowed a little by the air');
}
{
  // Split drops: closing the valve keeps the rest.
  const b = aloft(20);
  const out = hold(b, 0.25, {pour: true, ground: flat});
  const stop = hold(b, 4, {pour: false, ground: flat});
  near(b.water, 500, 1e-6, '0.25 s of pouring is 100 L, then the valve closes and 500 L stay');
  ok(types(stop.events).includes('pourStop'), 'closing the valve announces pourStop');
  const landed = [...out.patches, ...stop.patches].reduce((a, p) => a + p.litres, 0);
  near(landed, 100, 1e-6, 'all 100 L that left the bucket landed');
  // A part parcel is not lost when the valve closes.
  const c = aloft(20);
  hold(c, 0.1, {pour: true, ground: flat});
  const rest = hold(c, 4, {pour: false, ground: flat});
  near(c.water, 560, 1e-6, '0.1 s is 40 L');
  near(rest.patches.reduce((a, p) => a + p.litres, 0), 40, 1e-6, 'all 40 L lands, the 15 L part parcel included');
  ok(rest.patches.some(p => Math.abs(p.litres - 15) < 1e-6), 'closing the valve lets the part parcel go');
  eq(c.parcels.length, 0, 'nothing is left in the air');
  const d = aloft(20);
  hold(d, 0.5, {pour: true, ground: flat}); hold(d, 0.2, {pour: false, ground: flat}); hold(d, 0.1, {pour: true, ground: flat});
  eq(d.pouring, true, 'and it can be opened again');
}

// Where the water lands. Bucket bottom `height` metres up on flat ground.
function pourFrom(height, {speed = 0, wind = null, ground = flat, water = 600, move = false} = {}) {
  const b = createBucket({ground});
  Object.assign(b, {onGround: false, y: height + BUCKET.hang, x: 0, z: 0, vz: speed});
  setBucketWater(b, water);
  const patches = [];
  for (let n = 0; n < 120 * 40; n++) {
    const out = stepBucket(b, {ground, wind, pour: true});
    patches.push(...out.patches);
    if (move) b.z += b.vz * HELI_STEP;
    if (n > 360 && !b.parcels.length) break;
  }
  const litres = patches.reduce((a, p) => a + p.litres, 0);
  const mean = key => patches.reduce((a, p) => a + p[key] * p.litres, 0) / litres;
  return {bucket: b, patches, litres, x: mean('x'), z: mean('z')};
}
const tailwind = {speed: 7, toward: {x: 1, z: 0}};
{
  const still = pourFrom(30);
  near(still.litres, 600, 1e-6, 'from 30 m all 600 L lands');
  eq(still.patches.length, 24, 'in 24 patches');
  near(still.z, 0, 0.01, 'a hovering bucket pours straight down');
  const moving = pourFrom(30, {speed: 15});
  near(moving.litres, 600, 1e-6, 'moving at 15 m/s from 30 m, all 600 L lands');
  ok(moving.z > 8 && moving.z < 20, `the water lands forward of the release (${moving.z.toFixed(1)} m)`);
  const trail = pourFrom(30, {speed: 15, move: true});
  const reach = Math.max(...trail.patches.map(p => p.z)) - Math.min(...trail.patches.map(p => p.z));
  ok(reach > 18 && reach < 30, `flying on while pouring lays the water in a trail (${reach.toFixed(1)} m long)`);
  ok(trail.patches[0].z < trail.patches.at(-1).z, 'the first water lands first');
  const wind = pourFrom(30, {wind: tailwind});
  ok(wind.x > 10 && wind.x < 30, `7 m/s of wind with no speed: it lands ${wind.x.toFixed(1)} m downwind`);
  near(wind.z, 0, 0.01, 'and no sideways drift');
  const across = pourFrom(30, {wind: {speed: 7, toward: {x: 0, z: -1}}});
  ok(across.z < -10, 'wind the other way carries it the other way');
  const calm = pourFrom(30, {wind: {speed: 0, toward: {x: 1, z: 0}}});
  near(calm.x, 0, 0.01, 'no wind, no drift');
}

// Wider and thinner from higher.
{
  eq(keptShare(0), 1, 'a short fall keeps all the water');
  eq(keptShare(30), 1, 'up to 30 m');
  near(keptShare(60), 0.7, 1e-9, 'halfway to 90 m: 70%');
  near(keptShare(90), 0.4, 1e-9, '90 m: 40%');
  eq(keptShare(300), 0.4, 'and 40% above');
  near(wetRadius(0), 2, 1e-9, 'a disc at the ground is 2 m');
  near(wetRadius(30), 5.6, 1e-9, '30 m: 5.6 m');
  near(wetRadius(80), 11.6, 1e-9, '80 m: 11.6 m');
  const low = pourFrom(10), mid = pourFrom(30), high = pourFrom(80), top = pourFrom(150);
  ok(low.patches[0].radius < mid.patches[0].radius && mid.patches[0].radius < high.patches[0].radius, 'a higher drop wets a wider disc');
  near(high.patches[0].radius, wetRadius(80), 0.1, 'the disc follows the fall height');
  ok(high.litres < mid.litres, 'and less of the water arrives');
  near(high.litres / 600, keptShare(80), 0.01, `from 80 m about ${(keptShare(80) * 100).toFixed(0)}% arrives`);
  near(top.litres / 600, 0.4, 0.001, 'from 150 m only 40% arrives');
  ok(high.litres / high.patches.length < low.litres / low.patches.length, 'each patch is thinner');
  ok(top.litres < high.litres, 'and thinner still above that');
}

// Over forest the water lands on the tree tops.
{
  const trees = flatGround(0, [{x: 0, z: 0, radius: 6, base: 0, top: 20, shape: 'column', id: 't1', kind: 'tree'}]);
  const over = pourFrom(60, {ground: trees}), bare = pourFrom(60);
  ok(over.patches[0].radius < bare.patches[0].radius, 'water onto a tree top has a shorter fall, so a smaller disc');
  near(over.patches[0].radius, wetRadius(40), 0.1, 'measured from 40 m up to the top at 20 m');
  ok(over.litres > bare.litres, 'and more of it arrives');
}

// The aim ring agrees with the water.
{
  const probe = (height, options) => {
    const b = createBucket({ground: flat});
    Object.assign(b, {onGround: false, y: height + BUCKET.hang, x: 0, z: 0, vz: options.speed ?? 0, vy: options.climb ?? 0});
    setBucketWater(b, 600);
    return b;
  };
  for (const [height, options] of [[30, {}], [30, {wind: tailwind}], [60, {wind: {speed: 3.5, toward: {x: -0.6, z: 0.8}}}], [15, {speed: 12}]]) {
    // A bucket with speed flies on while it pours.
    const run = pourFrom(height, {...options, move: !!options.speed});
    const aim = aimPoint(probe(height, options), {ground: flat, wind: options.wind ?? null});
    ok(aim && Math.hypot(aim.x - run.x, aim.z - run.z) <= 2, `the ring is over the water at ${height} m (${Object.keys(options).join(', ') || 'still'})`);
    if (!options.speed) {
      const exact = aimPoint(probe(height, options), {ground: flat, wind: options.wind ?? null, dt: HELI_STEP});
      const first = run.patches[0];
      ok(Math.hypot(exact.x - first.x, exact.z - first.z) <= 0.2, `and agrees with the first parcel to 20 cm (${height} m)`);
    }
    near(aim.fall, height, 1e-9, 'its fall is the bucket height above the ground');
  }
  // Flying on while the whole bucket goes: the ring is on the middle of the water.
  for (const [height, speed] of [[15, 12], [30, 15], [30, 8]]) {
    const flown = pourFrom(height, {speed, move: true});
    const aim = aimPoint(probe(height, {speed}), {ground: flat});
    const gap = Math.hypot(aim.x - flown.x, aim.z - flown.z);
    ok(gap <= 2, `moving at ${speed} m/s from ${height} m: the ring is ${gap.toFixed(1)} m from the middle of the water`);
  }
  const trees = flatGround(0, [{x: 0, z: 0, radius: 6, base: 0, top: 20, shape: 'column', id: 't1', kind: 'tree'}]);
  const high = probe(60, {});
  near(aimPoint(high, {ground: trees}).fall, 40, 1e-6, 'over a tree the ring lands on the tree top');
  eq(aimPoint(probe(30, {}), {ground: createHeliGround({heightAt: () => -1e9})}), null, 'over a bottomless hole there is no landing point');
  ok(aimPoint(probe(30, {}), {ground: flat}).seconds > 1, 'it takes time to fall');
}

// The lock and the rings.
{
  const burning = (x, z) => Math.hypot(x - 5, z) < 10;
  ok(aimLocked({x: 5, z: 3}, burning), 'locked over a burning cell');
  ok(!aimLocked({x: 40, z: 3}, burning), 'not locked off it');
  ok(!aimLocked(null, burning), 'not locked with no landing point');
  eq(aimRingRadius(0), 12, 'H2 always uses the 12 m ring');
  eq(aimRingRadius(1), 8, 'the next lesson tier: 8 m');
  eq(aimRingRadius(3), 0, 'and finally no ring');
  eq(aimRingRadius(9), 0, 'tiers past the end stay at no ring');
  eq(aimRingRadius(-2), 12, 'and below the start at the first');
}

// Bucket in words.
{
  const b = createBucket({ground: flat});
  const words = water => { setBucketWater(b, water); return bucketWords(b); };
  eq(words(0), 'empty', '0 L: empty');
  eq(words(0.5), 'empty', 'a splash reads empty');
  eq(words(100), 'low', '100 L: low');
  eq(words(200), 'low', '200 L: low');
  eq(words(300), 'half', '300 L: half');
  eq(words(500), 'half', '500 L: half');
  eq(words(560), 'full', '560 L: full');
  eq(words(600), 'full', '600 L: full');
  damageBucket(b, 1); setBucketWater(b, 450);
  eq(bucketWords(b), 'full', 'a dented bucket that holds all it can reads full');
  damageBucket(b, 3);
  eq(bucketWords(b), 'ruined', 'a bucket that holds nothing reads ruined');
}

// Damage: what it holds, what it leaks, and that it only gets worse.
{
  const b = createBucket({ground: flat});
  eq(b.damage, 0, 'new: whole');
  eq(bucketHolds(b), 600, 'holds 600');
  setBucketWater(b, 600);
  ok(damageBucket(b, 1), 'a dent');
  eq(bucketHolds(b), 450, 'dented holds 450 L');
  near(b.water, 450, 1e-9, 'the extra 150 L spills at once');
  near(b.massKg, 500, 1e-9, 'and the mass follows');
  ok(!damageBucket(b, 0), 'damage never gets better by itself');
  ok(!damageBucket(b, 1), 'or changes for the same level');
  eq(b.damage, 1, 'still dented');
  ok(damageBucket(b, 2), 'a tear');
  eq(bucketHolds(b), 300, 'torn holds 300 L');
  near(b.water, 300, 1e-9, 'water cut to 300 L');
  ok(damageBucket(b, 3), 'ruined');
  eq(bucketHolds(b), 0, 'ruined holds nothing');
  near(b.water, 0, 1e-9, 'and has no water');
  near(b.massKg, 50, 1e-9, 'at 50 kg');
  eq(bucketHit(b, {type: 'cargoHit', id: 'bucket', kind: 'cargoLight'}), 3, 'a light hit cannot mend a ruined bucket');
  eq(createBucket({damage: 2, ground: flat}).damage, 2, 'a saved torn bucket comes back torn');
  eq(createBucket({damage: 9, ground: flat}).damage, 3, 'damage is kept in range');
  eq(createBucket({damage: -4, ground: flat}).damage, 0, 'both ways');
}
{
  // Hits from the cable.
  const hit = (kind, start = 0, extra = {}) => { const b = createBucket({damage: start, ground: flat}); return bucketHit(b, {type: 'cargoHit', id: 'bucket', kind, with: 'tree', speed: 9, ...extra}); };
  eq(hit('cargoLight'), 1, 'a light hit dents it');
  eq(hit('cargoHeavy'), 2, 'a heavy hit tears it');
  eq(hit('cargoWreck'), 3, 'a wreck ruins it');
  eq(hit('cargoLight', 2), 2, 'a light hit does not mend a torn bucket');
  eq(hit('cargoHeavy', 3), 3, 'nor a ruined one');
  eq(hit('cargoLight', 0, {id: 'car'}), 0, 'a hit on another load is not the bucket\'s');
  eq(hit('nonsense'), 0, 'an unknown class does nothing');
  const b = createBucket({ground: flat});
  eq(bucketHit(b, {type: 'treeDown', id: 't1'}), 0, 'other events do nothing');
  eq(bucketHit(b, null), 0, 'and no event is fine');
  eq(HIT_DAMAGE.cargoLight, 1, 'the map: light is dented'); eq(HIT_DAMAGE.cargoHeavy, 2, 'heavy is torn'); eq(HIT_DAMAGE.cargoWreck, 3, 'wreck is ruined');
  // The real cable's hit classes map straight through.
  const heli = createHeliState({ground: flat, y: 60});
  const swing = createBucket({ground: flat});
  Object.assign(swing, {onGround: false, y: 30, vz: 12, vy: -20});
  const out = [];
  for (let i = 0; i < 600 && !out.length; i++) { stepBucket(swing, {ground: flat}); out.push(...stepCable(swing, heli, {ground: flat}).events.filter(e => e.type === 'cargoHit')); }
  ok(out.length === 1 && out[0].id === 'bucket', 'the cable reports the bucket\'s ground strike');
  bucketHit(swing, out[0]);
  eq(swing.damage, HIT_DAMAGE[out[0].kind], 'and the helper maps its class to damage');
}

// Holds and leaks.
{
  const dented = held(1, {damage: 1}); hold(dented, 10);
  near(dented.water, 450, 0.5, 'a dented bucket fills only to 450 L (leaking 3 L/s while it fills)');
  const full = held(1, {damage: 1}); setBucketWater(full, 450);
  hold(full, 20, {ground: flat});
  near(full.water, 450 - 60, 1e-6, 'a dented bucket in the air leaks 3 L/s: 60 L in 20 s');
  const torn = held(1, {damage: 2}); setBucketWater(torn, 300);
  hold(torn, 10, {ground: flat});
  near(torn.water, 300 - 80, 1e-6, 'a torn bucket leaks 8 L/s: 80 L in 10 s');
  hold(torn, 40, {ground: flat});
  eq(torn.water, 0, 'and runs dry without going negative');
  near(torn.massKg, 50, 1e-9, 'at 50 kg');
  const whole = held(1); setBucketWater(whole, 600);
  hold(whole, 20, {ground: flat});
  eq(whole.water, 600, 'a whole bucket does not leak');
  const ruined = held(1, {damage: 3}); hold(ruined, 10);
  eq(ruined.water, 0, 'a ruined bucket takes in nothing');
  eq(bucketWords(ruined), 'ruined', 'and says so');
  const torned = held(1, {damage: 2}); hold(torned, 8);
  ok(torned.water > 280 && torned.water <= 300, `a torn bucket fills to its 300 L despite the leak (${torned.water.toFixed(1)} L)`);
}

// Dipping too fast: no filling and one light hit per dip.
{
  const b = held(1, {speed: 12, water: 0});
  const out = hold(b, 1, {}, {keepSpeed: 12});
  eq(b.water, 0, 'over 10 m/s the bucket takes in nothing');
  eq(b.damage, 1, 'and is dented');
  eq(types(out.events).filter(t => t === 'bucketDamaged').length, 1, 'once');
  eq(types(out.events).filter(t => t === 'bucketFast').length, 1, 'with one warning');
  eq(types(out.events).filter(t => t === 'bucketDip').length, 1, 'in one dip');
  // Out of the water and in again: a second dip, but it is dented already.
  b.y += 5; hold(b, 0.1, {}, {keepSpeed: 12});
  b.y -= 5; const again = hold(b, 1, {}, {keepSpeed: 12});
  eq(types(again.events).filter(t => t === 'bucketFast').length, 1, 'a second fast dip is warned about');
  eq(types(again.events).filter(t => t === 'bucketDamaged').length, 0, 'but a dented bucket takes no further light hit');
  eq(b.damage, 1, 'still dented, not torn');
  const torn = held(1, {speed: 12, damage: 2}); hold(torn, 1, {}, {keepSpeed: 12});
  eq(torn.damage, 2, 'a torn bucket is not made better by a light hit');
  // Slow dips never hurt.
  const slow = held(1, {speed: 9}); hold(slow, 2, {}, {keepSpeed: 9});
  eq(slow.damage, 0, 'at 9 m/s the bucket is not damaged');
  ok(slow.water > 0, 'and takes in water at half rate');
  // The drag slows it: a bucket thrown in at 9 m/s ends up slower with no keeping.
  const drag = held(1, {speed: 9}); hold(drag, 2);
  ok(drag.vz < 9, 'dragged back by the water');
}

// Full is announced once, even for a leaking bucket sitting in the water.
{
  const b = held(1, {damage: 1}); const out = hold(b, 12);
  eq(types(out.events).filter(t => t === 'bucketFull').length, 1, 'bucketFull comes once');
  const whole = held(1); const w = hold(whole, 12);
  eq(types(w.events).filter(t => t === 'bucketFull').length, 1, 'once for a whole bucket too');
  eq(types(w.events).filter(t => t === 'bucketDip').length, 1, 'one dip');
  const refill = held(1); setBucketWater(refill, 0); const second = hold(refill, 8);
  eq(types(second.events).filter(t => t === 'bucketFull').length, 1, 'and again after it was emptied');
}

// A 50 kg bucket on the 15 m cable stays steady under a moving helicopter.
function flightWith(water, seconds = 60, ground = flat) {
  const heli = createHeliState({ground, altitudeOffset: 250});
  heli.y = 60; heli.onGround = false;
  const bucket = createBucket({ground, x: heli.x, z: heli.z});
  Object.assign(bucket, {onGround: false, y: heli.y - CABLE.length});
  setBucketWater(bucket, water);
  const script = t => ({lift: Math.sin(t * 0.4) * 0.3, pitch: Math.cos(t * 0.3) * 0.9, roll: Math.sin(t * 0.55) * 0.5, yaw: Math.sin(t * 0.2) * 0.4});
  let maxSpeed = 0, maxStretch = 0, maxHeli = 0, worstGap = Infinity;
  const events = [];
  for (let n = 0; n < Math.round(seconds / HELI_STEP); n++) {
    const out = stepBucket(bucket, {ground});
    const cable = stepCable(bucket, heli, {ground});
    events.push(...out.events, ...cable.events);
    stepHeli(heli, script(heli.t), {ground, external: cable.force});
    maxSpeed = Math.max(maxSpeed, Math.hypot(bucket.vx, bucket.vy, bucket.vz));
    maxHeli = Math.max(maxHeli, Math.hypot(heli.vx, heli.vy, heli.vz));
    maxStretch = Math.max(maxStretch, Math.hypot(heli.x - bucket.x, heli.y - bucket.y, heli.z - bucket.z) - CABLE.length);
    worstGap = Math.min(worstGap, Math.hypot(heli.x - bucket.x, heli.y - bucket.y, heli.z - bucket.z));
  }
  return {heli, bucket, maxSpeed, maxStretch, maxHeli, worstGap, events};
}
{
  const run = flightWith(0);
  ok(!run.heli.crashed, 'the helicopter flies the whole 60 s');
  ok(run.maxHeli > 5, `and really moves (up to ${run.maxHeli.toFixed(1)} m/s)`);
  ok(Number.isFinite(run.bucket.x + run.bucket.y + run.bucket.z), 'the bucket stays a number');
  ok(run.maxSpeed < run.maxHeli * 1.6 + 3, `no runaway speed (bucket ${run.maxSpeed.toFixed(1)} m/s, helicopter ${run.maxHeli.toFixed(1)} m/s)`);
  ok(run.maxStretch < 0.1, `the cable never stretches more than 10 cm (${(run.maxStretch * 100).toFixed(1)} cm)`);
  ok(run.worstGap > CABLE.bodyRadius, 'the bucket never swings into the helicopter');
  ok(!types(run.events).includes('cargoHit'), 'and hits nothing');
  const full = flightWith(600);
  ok(!full.heli.crashed && full.maxStretch < 0.2, `a full bucket on the same flight is just as steady (${(full.maxStretch * 100).toFixed(1)} cm)`);
  const half = flightWith(300, 30);
  ok(!half.heli.crashed && Number.isFinite(half.bucket.x), 'and a half bucket');
}

// The same inputs give the same results, to the last digit.
{
  const finger = ({heli, bucket}) => `${heliFingerprint(heli)}|${[bucket.x, bucket.y, bucket.z, bucket.vx, bucket.vy, bucket.vz, bucket.water, bucket.massKg].map(v => v.toFixed(6)).join('|')}`;
  const a = finger(flightWith(300, 20)), b = finger(flightWith(300, 20));
  eq(a, b, 'the same flight with a bucket gives the same fingerprint');
  const patchPrint = r => r.patches.map(p => [p.x, p.z, p.litres, p.radius].map(v => v.toFixed(9)).join(',')).join(';');
  eq(patchPrint(pourFrom(40, {speed: 9, wind: tailwind})), patchPrint(pourFrom(40, {speed: 9, wind: tailwind})), 'and the same pour lands the same water');
  const dip = () => dipLake(17.8, 8).bucket;
  eq(dip().water.toFixed(9), dip().water.toFixed(9), 'and the same dip fills the same');
  // The aim ring does not change the bucket.
  const b1 = held(1, {water: 300}); const before = JSON.stringify(b1);
  aimPoint(b1, {ground: flat});
  eq(JSON.stringify(b1), before, 'asking for the ring changes nothing');
}

// Fitted at the pad and flown away on the cable (a hooked load needs no extra hook).
{
  const heli = createHeliState({ground: flat});
  const bucket = createBucket({ground: flat, x: heli.x, z: heli.z});
  for (let i = 0; i < 240; i++) {
    stepBucket(bucket, {ground: flat});
    const cable = stepCable(bucket, heli, {ground: flat});
    stepHeli(heli, {}, {ground: flat, external: cable.force});
  }
  ok(heli.onGround && bucket.onGround, 'a fitted bucket sits at the pad with the helicopter');
  near(bucket.y, flat.height(bucket.x, bucket.z) + 3.8, 0.01, 'resting with its body on the ground');
  const events = [];
  for (let i = 0; i < 120 * 12; i++) {
    stepBucket(bucket, {ground: flat});
    const cable = stepCable(bucket, heli, {ground: flat});
    events.push(...cable.events);
    stepHeli(heli, {lift: 1}, {ground: flat, external: cable.force});
  }
  ok(!heli.onGround && heli.y > 15, `lifting off takes the bucket with it (helicopter at ${heli.y.toFixed(1)} m)`);
  ok(types(events).includes('loadLifted'), 'the bucket lifts off the ground');
  ok(bucket.y > 3.9, 'and hangs below the helicopter');
}

// An empty bucket hovering on the cable pulls steadily: the light load does
// not shake the cable at the step rate.
{
  const heli = {x: 0, y: 40, z: 0, vx: 0, vy: 0, vz: 0};
  const bucket = createBucket({ground: flat});
  Object.assign(bucket, {onGround: false, y: 40 - 15.002, x: 0, z: 0});
  let last = null, jump = 0, peak = 0;
  for (let n = 0; n < 120 * 5; n++) {
    stepBucket(bucket, {ground: flat});
    const pull = -stepCable(bucket, heli, {ground: flat}).force.y;
    if (n > 120 && last !== null) jump = Math.max(jump, Math.abs(pull - last));
    if (n > 120) peak = Math.max(peak, pull);
    last = pull;
  }
  ok(jump < 5 && Math.abs(last - BUCKET.emptyKg * 9.81) < 5, `an empty bucket hangs at its weight (${last.toFixed(0)} N, step change at most ${jump.toFixed(1)} N)`);
}

// Tremblant Snow's lake is frozen: nothing to scoop there.
{
  const snow = new Course(TREMBLANT_SNOW, 1989), water = courseWater(snow);
  const lake = snow.def.basins[0], middle = snow.worldAt(snow.phase(lake.s), lake.lateral);
  eq(water(middle.x, middle.z), null, 'the frozen lake at Tremblant Snow gives no water');
  ok(courseWater(course)(course.worldAt(course.phase(lake.s), lake.lateral).x, course.worldAt(course.phase(lake.s), lake.lateral).z) !== null,
    'while the same lake at Tremblant Woods does');
}

console.log(`test-heli-bucket: ${checks} checks passed`);
