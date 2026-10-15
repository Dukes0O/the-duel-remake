// Where rescues happen (docs/HELI_RESCUE.md section 5) on the real courses.
import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {courseSite} from '../src/heli/heli-session.js';
import {createHeliState, stepHeli, HELI_STEP, GRAVITY} from '../src/heli/heli-flight.js';
import {flatGround} from '../src/heli/heli-ground.js';
import {SUPPLY_CRATES} from '../src/heli/heli-rescue.js';
import {SEARCH, clearCircle, hikerSpots, pickHiker, hikerSpotted, hikerWalk, slideSpots, pickSlide, beaconSignal,
  hoistSpots, pickHoist, supplyYard, crateSpots, liftAt} from '../src/heli/heli-search.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const eq = (a, b, label) => { assert.deepEqual(a, b, label); checks++; };
const near = (a, b, tolerance, label) => { assert.ok(Math.abs(a - b) <= tolerance, `${label}: ${a} vs ${b}`); checks++; };
const worlds = new Map();
const load = id => {
  if (!worlds.has(id)) {
    const course = new Course(ALL_CIRCUITS.find(def => def.id === id), 1989), ground = groundFromCourse(course);
    worlds.set(id, {course, ground});
  }
  return worlds.get(id);
};
const slope = (ground, x, z, d = 5) => Math.atan(Math.hypot((ground.height(x + d, z) - ground.height(x - d, z)) / (2 * d),
  (ground.height(x, z + d) - ground.height(x, z - d)) / (2 * d))) * 180 / Math.PI;

// ---- the lost hiker -------------------------------------------------------
for (const id of ['tremblant-woods', 'panorama-ridge']) {
  const {course, ground} = load(id), site = courseSite(course, ground, id);
  const spots = hikerSpots(course, ground, site);
  ok(spots.length >= 50, `${id}: plenty of places a hiker can be lost (${spots.length})`);
  for (const spot of spots.slice(0, 40)) {
    ok(ground.near(spot.x, spot.z, 14).filter(o => o.kind === 'tree').length >= 3, `${id}: the hiker is in forest`);
    ok(Math.hypot(spot.clearing.x - spot.x, spot.clearing.z - spot.z) <= SEARCH.clearingWithin, 'a clearing within 120 m');
    ok(clearCircle(course, ground, spot.clearing.x, spot.clearing.z, SEARCH.clearingRadius), 'a clear, level 12 m circle');
  }
  const picked = pickHiker(spots, 12345);
  ok(Math.hypot(picked.lastSeen.x - picked.hiker.x, picked.lastSeen.z - picked.hiker.z) <= SEARCH.hikerFromPoint, 'within 250 m of where last seen');
  eq(picked.lastSeen.radius, 300, 'the search circle is 300 m across the point');
  eq(pickHiker(spots, 12345), picked, 'the same seed, the same hiker');
  ok(JSON.stringify(pickHiker(spots, 777)) !== JSON.stringify(picked), 'another seed, another hiker');
}
{
  const ground = flatGround(0), hiker = {x: 0, z: 0};
  ok(hikerSpotted({x: 69, y: 100, z: 0}, hiker, ground), 'spotted 69 m sideways, 100 m up');
  ok(!hikerSpotted({x: 71, y: 50, z: 0}, hiker, ground), 'not 71 m sideways');
  ok(!hikerSpotted({x: 0, y: 121, z: 0}, hiker, ground), 'not 121 m up');
  const walk = hikerWalk({x: 0, z: 0}, {x: 12, z: 0}, 5);
  eq([walk.x, walk.arrived], [6, false], '1.2 m/s toward the clearing');
  eq(hikerWalk({x: 0, z: 0}, {x: 12, z: 0}, 20).arrived, true, 'and arrives');
}

// ---- the avalanche --------------------------------------------------------
for (const [id, least, band] of [['tremblant-snow', 3, [10, 40]], ['summit-run', 5, [20, 40]]]) {
  const {course, ground} = load(id);
  const slides = slideSpots(course, ground);
  ok(slides.length >= least, `${id}: at least ${least} slides (${slides.length})`);
  for (const slide of slides) {
    ok(slide.slope >= band[0] && slide.slope <= band[1], `${id}: a slide's mean slope ${slide.slope} is within ${band.join(' to ')} degrees`);
    const nearRoad = course.nearest(slide.x, slide.z);
    ok(Math.abs(nearRoad.lateral) - course.roadHalfWidthAt(course.phase(nearRoad.s)) >= SEARCH.slideClear, 'well off the road');
  }
  const lodge = course.def.kitPlacements?.find(k => k.id === 'ski-lodge');
  if (lodge) {
    const at = course.worldAt(course.phase(lodge.s), lodge.lateral);
    ok(slides.every(slide => Math.hypot(slide.x - at.x, slide.z - at.z) >= SEARCH.slideClear), 'clear of the lodge');
  }
  const picked = pickSlide(slides, 99, ground);
  const dx = picked.beacon.x - picked.slide.x, dz = picked.beacon.z - picked.slide.z;
  const down = dx * picked.slide.down.x + dz * picked.slide.down.z, across = -dx * picked.slide.down.z + dz * picked.slide.down.x;
  ok(Math.abs(down) <= SEARCH.slideDown / 2 && Math.abs(across) <= SEARCH.slideAcross / 2, 'the beacon is buried inside the slide');
  eq(pickSlide(slides, 99, ground), picked, 'the same seed, the same slide and beacon');
}
// Summit Run's slides are its steep snowfields; Tremblant Snow's ski hill is gentle.
ok(slideSpots(load('summit-run').course, load('summit-run').ground).every(s => s.slope >= 20), 'Summit Run: 20 to 40 degrees');
{
  const beacon = {x: 0, y: 0, z: 0};
  const at = d => beaconSignal({x: d, y: 0, z: 0}, beacon);
  near(at(60).interval, 1.75, 1e-9, 'a beep every 1.75 s at the edge of range');
  near(at(0).interval, 0.15, 1e-9, 'every 0.15 s right on top');
  near(at(0).pitch, 1400, 1e-9, '1,400 Hz on top');
  near(at(60).pitch, 900, 1e-9, '900 Hz at the edge');
  near(at(0).bar, 1, 1e-9, 'a full bar on top');
  near(at(30).bar, .25, 1e-9, 'the bar fades with the square of the distance');
  eq(at(61).heard, false, 'no signal past 60 m');
  eq(beaconSignal({x: 40, y: 50, z: 0}, beacon).heard, false, 'height counts: 40 m across and 50 up is out of range');
  ok(!('direction' in at(30)) && !('bearing' in at(30)), 'no arrow and no distance shown: only the beeps and the bar');
}

// ---- the hoist rescue -----------------------------------------------------
{
  const {course, ground} = load('panorama-ridge');
  const spots = hoistSpots(course, ground);
  ok(spots.length >= 5, `Panorama Ridge offers at least 5 hoist spots (${spots.length})`);
  for (const spot of spots.slice(0, 30)) {
    ok(SEARCH.hoistSections.includes(course.sectionAt(spot.s)?.name), 'along Mountain Climb or The Ridge');
    ok(course.at(spot.s).y - spot.y >= SEARCH.hoistBelowRoad, '10 m or more below the road');
    const s = slope(ground, spot.x, spot.z);
    ok(s >= 25 && s <= 40, `steep: ${s.toFixed(1)} degrees`);
    ok(!ground.near(spot.x, spot.z, SEARCH.hoistTreeClear).some(o => o.kind === 'tree'), 'no tree within 12 m');
    const roadNear = course.nearest(spot.x, spot.z), gap = Math.abs(roadNear.lateral) - course.roadHalfWidthAt(course.phase(roadNear.s));
    ok(gap >= SEARCH.hoistFromEdge[0] - 2 && gap <= SEARCH.hoistFromEdge[1] + 2, `20 to 120 m from the road edge (${gap.toFixed(0)})`);
  }
  const picked = pickHoist(spots, 5, ground);
  ok(Math.hypot(picked.car.x - picked.driver.x, picked.car.z - picked.driver.z) < 6, 'their car lies beside them');
  eq(pickHoist(spots, 5, ground), picked, 'the same seed, the same driver');
}

// ---- the supply run -------------------------------------------------------
for (const id of ['summit-run', 'tremblant-snow']) {
  const {course, ground} = load(id), yard = supplyYard(course, ground);
  ok(yard && clearCircle(course, ground, yard.x, yard.z, yard.radius), `${id}: a clear 10 m yard by the hut or lodge`);
  // Summit Run becomes a destination with RESCUE-ENGINE; until then, a point beside its start.
  const zone = id === 'summit-run' ? course.worldAt(0, 40) : courseSite(course, ground, id).zone;
  const crates = crateSpots(course, ground, zone);
  eq(crates.length, 3, `${id}: three crate spots by the landing zone`);
}
{
  // Thin air: Summit Run starts at 2,860 m and the hut is 720 m higher.
  const {course} = load('summit-run');
  const hut = course.def.kitPlacements.find(k => k.id === 'summit-hut');
  const climb = course.worldAt(course.phase(hut.s), hut.lateral).y - course.at(0).y;
  near(climb, 720, 5, "the hut stands about 720 m above Summit Run's start");
  ok(liftAt(2860) > liftAt(2860 + climb), 'less lift higher up');
  const ground = flatGround(0);
  const climbIn60 = (altitude, fuelKg, cargoKg) => {
    const h = createHeliState({x: 0, z: 0, heading: 0, fuelKg, mode: 'assisted', altitudeOffset: altitude, ground});
    Object.assign(h, {y: 40, onGround: false, engine: true, rotorPct: 100});
    for (let n = 0; n < 60 * 120; n++) stepHeli(h, {lift: 1}, {ground, external: {x: 0, y: -cargoKg * GRAVITY, z: 0}}, HELI_STEP);
    return h.y - 40;
  };
  const drums = SUPPLY_CRATES.summitRun.find(crate => crate.id === 'fuel').massKg;
  ok(climbIn60(2860, 400, drums) < 0, `a full tank and the ${drums} kg drums do not climb out of the start area`);
  ok(climbIn60(2860, 200, drums) > 60, 'half a tank does');
  ok(climbIn60(2860 + climb - 80, 150, drums) > 20, 'and still climbs near the hut');
  ok(SUPPLY_CRATES.summitRun.every(crate => crate.id === 'fuel' || climbIn60(2860, 400, crate.massKg) > 60), 'the food and medicine lift with a full tank');
}

console.log(`test-heli-search: ${checks} checks passed`);
