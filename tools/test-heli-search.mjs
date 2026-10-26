// Where rescues happen (docs/HELI_RESCUE.md section 5) on the real courses.
import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {courseSite} from '../src/heli/heli-session.js';
import {createHeliState, stepHeli, HELI_STEP, GRAVITY, KESTREL} from '../src/heli/heli-flight.js';
import {createAutopilot, toggleAutopilot, setAutopilotTarget, autopilotStep} from '../src/heli/heli-autopilot.js';
import {createLoad, stepCable} from '../src/heli/heli-cable.js';
import {AVALANCHE} from '../src/summit-avalanche.js';
import {flatGround} from '../src/heli/heli-ground.js';
import {SUPPLY_CRATES} from '../src/heli/heli-rescue.js';
import {SEARCH, clearCircle, hikerSpots, pickHiker, hikerSpotted, hikerWalk, slideSpots, pickSlide, beaconSignal,
  hoistSpots, pickHoist, supplyYard, supplyPickup, crateSpots, liftAt} from '../src/heli/heli-search.js';

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
    ok(clearCircle(course, ground, spot.clearing.x, spot.clearing.z, SEARCH.clearingRadius), 'a clear, level circle of 12 m radius');
  }
  const picked = pickHiker(spots, 12345);
  ok(Math.hypot(picked.lastSeen.x - picked.hiker.x, picked.lastSeen.z - picked.hiker.z) <= SEARCH.hikerFromPoint, 'within 120 m of where last seen');
  eq(picked.lastSeen.radius, 180, 'the search circle has a 180 m radius');
  eq(pickHiker(spots, 12345), picked, 'the same seed, the same hiker');
  ok(hikerSpots(course, ground, site) === spots, 'worked out once per course');
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
  if (!course.def.hills?.length) ok(slides.every(slide => SEARCH.slideSections.includes(course.sectionAt(course.phase(course.nearest(slide.x, slide.z).s))?.name)),
    `${id}: every slide beside the Snowfields or the Avalanche Gallery`);
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
// Summit Run's slides are its steep snowfields (20 to 40 degrees, checked above); Tremblant Snow's ski hill is gentle.
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
  for (const spot of spots) {
    const start = course.at(40);
    ok(Math.hypot(spot.x - start.x, spot.z - start.z) <= 550, 'the hoist site is within 550 m of the start');
    const roadNear = course.nearest(spot.x, spot.z), gap = Math.abs(roadNear.lateral) - course.roadHalfWidthAt(course.phase(roadNear.s));
    ok(SEARCH.hoistSections.includes(course.sectionAt(course.phase(roadNear.s))?.name), 'beside Mountain Climb or The Ridge');
    ok(course.at(course.phase(roadNear.s)).y - spot.y >= SEARCH.hoistBelowRoad, '10 m or more below the nearest road');
    const s = slope(ground, spot.x, spot.z);
    ok(s >= 25 && s <= 40, `steep: ${s.toFixed(1)} degrees`);
    ok(!ground.near(spot.x, spot.z, SEARCH.hoistTreeClear).some(o => o.kind === 'tree'), 'no tree within 12 m');
    ok(gap >= SEARCH.hoistFromEdge[0] && gap <= SEARCH.hoistFromEdge[1], `20 to 120 m from the nearest road edge (${gap.toFixed(0)})`);
  }
  const picked = pickHoist(spots, 5, ground);
  ok(Math.hypot(picked.car.x - picked.driver.x, picked.car.z - picked.driver.z) < 6, 'their car lies beside them');
  eq(pickHoist(spots, 5, ground), picked, 'the same seed, the same driver');
}

// ---- the supply run -------------------------------------------------------
eq(SEARCH.slideCrossesRoad, AVALANCHE.from, "the pickup is measured from where Summit Run's avalanche crosses the road");
for (const id of ['summit-run', 'tremblant-snow']) {
  const {course, ground} = load(id), yard = supplyYard(course, ground);
  ok(yard && yard.radius === 10 && clearCircle(course, ground, yard.x, yard.z, yard.radius), `${id}: a clear yard of 10 m radius by the hut or lodge`);
  // Summit Run's crates wait at the pickup; Tremblant Snow's at the home pad, or here its landing zone.
  const pickup = supplyPickup(course, ground);
  if (id === 'summit-run') {
    ok(pickup && pickup.s <= AVALANCHE.from - SEARCH.pickupBelowSlide, 'the pickup is on the open road below the avalanche');
    ok(clearCircle(course, ground, pickup.x, pickup.z, 12), 'a clear landing circle of 12 m radius');
  } else eq(pickup, null, 'no pickup away from Summit Run: the crates wait at the home pad');
  const zone = pickup ?? courseSite(course, ground, id).zone;
  eq(crateSpots(course, ground, zone).length, 3, `${id}: three crate spots by the pickup`);
}
{
  // Thin air: Summit Run starts at 2,860 m; the pickup is about 570 m higher and the hut yard 150 m above that.
  const {course, ground: summit} = load('summit-run');
  const startY = course.at(0).y, altitude = y => 2860 + y - startY;
  const pickup = supplyPickup(course, summit), yard = supplyYard(course, summit);
  near(altitude(pickup.y), 3430, 20, 'the pickup is at about 3,430 m');
  near(yard.y - pickup.y, 150, 10, 'the yard is about 150 m higher');
  ok(liftAt(altitude(pickup.y)) > liftAt(altitude(yard.y)), 'less lift higher up');
  const flat = flatGround(0);
  const climbIn60 = (altitude, fuelKg, cargoKg) => {
    const h = createHeliState({x: 0, z: 0, heading: 0, fuelKg, mode: 'assisted', altitudeOffset: altitude, ground: flat});
    Object.assign(h, {y: 40, onGround: false, engine: true, rotorPct: 100});
    for (let n = 0; n < 60 * 120; n++) stepHeli(h, {lift: 1}, {ground: flat, external: {x: 0, y: -cargoKg * GRAVITY, z: 0}}, HELI_STEP);
    return h.y - 40;
  };
  const drums = SUPPLY_CRATES.summitRun.find(crate => crate.id === 'fuel').massKg;
  const half = KESTREL.tankKg / 2;
  ok(climbIn60(altitude(pickup.y), KESTREL.tankKg, drums) < 0, `a full tank and the ${drums} kg drums do not climb out of the pickup`);
  ok(climbIn60(altitude(pickup.y), half, drums) > 30, 'half a tank does');
  const most = KESTREL.tankKg * 0.75;
  ok(climbIn60(altitude(pickup.y), most, drums) > 60, 'so does three quarters of a tank');
  ok(climbIn60(altitude(yard.y), half - 80, drums) > 20, 'and still climbs at the yard');
  ok(SUPPLY_CRATES.summitRun.every(crate => crate.id === 'fuel' || climbIn60(altitude(pickup.y), KESTREL.tankKg, crate.massKg) > 30),
    'the food and medicine lift with a full tank');

  // The whole job, flown on autopilot over Summit Run's real ground: each crate up, and back empty.
  const leg = (from, to, fuelKg, massKg) => {
    const h = createHeliState({x: from.x, z: from.z, heading: 0, fuelKg, mode: 'assisted', altitudeOffset: 2860 - startY, ground: summit});
    Object.assign(h, {y: from.y + 25, onGround: false, engine: true, rotorPct: 100});
    const crate = massKg ? Object.assign(createLoad({id: 'crate', massKg, x: from.x, z: from.z, ground: summit}), {hooked: true, onGround: false, y: from.y + 10}) : null;
    const pilot = createAutopilot(); toggleAutopilot(pilot, h); setAutopilotTarget(pilot, {x: to.x, z: to.z, groundY: to.y});
    let pull = {x: 0, y: 0, z: 0};
    for (let t = 0; t < 600 && !h.crashed; t += HELI_STEP) {
      const {commands} = autopilotStep(pilot, h, {}, {ground: summit, hang: crate ? 16 : 0, load: crate});
      stepHeli(h, {}, {ground: summit, commands, external: pull}, HELI_STEP);
      if (crate) pull = stepCable(crate, h, {ground: summit}).force;
      if (Math.hypot(h.x - to.x, h.z - to.z) < 40 && Math.hypot(h.vx, h.vz) < 2) break;
    }
    ok(!h.crashed && Math.hypot(h.x - to.x, h.z - to.z) < 40, `a ${massKg} kg leg arrives`);
    return fuelKg - h.fuelKg;
  };
  const back = leg(yard, pickup, half, 0), reserve = KESTREL.tankKg * KESTREL.lowFuelShare;
  const trips = SUPPLY_CRATES.summitRun.map(crate => leg(pickup, yard, crate.id === 'fuel' ? most : KESTREL.tankKg, crate.massKg) + back);
  // A minute of hooking, setting down and landing on each round trip, at the hover's burn.
  const handling = 60 * (KESTREL.burnIdle + KESTREL.burnPerCollective * 0.8);
  ok(trips[2] + handling < most - reserve, `the drums' round trip (${(trips[2] + handling).toFixed(0)} kg) fits in three quarters of a tank above the reserve`);
  ok(trips.reduce((a, b) => a + b + handling, 0) > KESTREL.tankKg, 'three round trips need more than a tank, so the fuel truck waits at the pickup');
}

console.log(`test-heli-search: ${checks} checks passed`);
