// The five Summit Run ski zones (docs/HELI_SKIING.md section 5, card
// SKI-RUNS): every zone loads, the guide skis each timed run through every
// gate, the aerials kicker and hill give a safe landing, the moguls hold their
// bumps and kickers, the powder run reaches the pickup from the summit pad and
// every stash, and the drop pads are real, level landing circles in the Summit
// Run world. All of it runs without graphics.
import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {clearCircle} from '../src/heli/heli-search.js';
import {KESTREL, airFactor} from '../src/heli/heli-flight.js';
import {SUMMIT_RUN} from '../src/heli/heli-jobs.js';
import {SKI, SKI_STEP, createSkier, stepSkier} from '../src/ski/ski-physics.js';
import {SCORE, createTimedRun, stepTimedRun, createJudgedRun, stepJudgedRun, finishJudgedRun, timedMedal} from '../src/ski/ski-score.js';
import {guideRun} from '../src/ski/ski-guide.js';
import {
  SKI_RUN_IDS, SKI_ALTITUDES, SUMMIT_PADS, SUMMIT_BASE_ALTITUDE, SUMMIT_START_Y, altitudeOf, MOGUL_SHAPE, AERIALS_SHAPE, POWDER_SHAPE,
  skiZone, zoneGuide, medalLimits, judgedConfig, stashAt, atPickup,
} from '../src/ski/runs/summit-zones.js';
import {distanceToLine} from '../src/ski/runs/recipe.js';

const DEG = Math.PI / 180;
let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const near = (actual, expected, tolerance, label) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} not within ${tolerance} of ${expected}`);
  checks++;
};
const guideOf = zone => guideRun({line: zone.line, world: zone, sampleEvery: 1, ...(zone.guide ? {lookAhead: zone.guide} : {})});
// The slope angle (degrees) of a zone's centre line between two z, from its heights.
const angleBetween = (zone, z0, z1, x = 0) => Math.atan2(zone.ground(x, z0) - zone.ground(x, z1), z1 - z0) / DEG;

same(SKI_RUN_IDS, ['slalom', 'gs', 'moguls', 'aerials', 'powder'], 'the five runs');
assert.throws(() => skiZone('nope'), /Unknown ski run/); checks++;

// ---- Every zone loads ------------------------------------------------------------
for (const id of SKI_RUN_IDS) {
  const zone = skiZone(id);
  same(skiZone(id), zone, `${id}: one zone, built once`);
  ok(zone.id === id && zone.name && ['devils', 'summit', 'pickup'].includes(zone.pad), `${id}: named, with a pad`);
  ok(typeof zone.ground === 'function' && Object.isFrozen(zone) && Object.isFrozen(zone.pickup), `${id}: snow from a recipe, the data frozen`);
  same([zone.drop.x, zone.drop.z], [0, 0], `${id}: the drop pad is the origin of its frame`);
  near(zone.drop.y, zone.ground(0, 0), 1e-9, `${id}: the drop height is the snow's`);
  near(zone.pickup.y, zone.ground(zone.pickup.x, zone.pickup.z), 1e-9, `${id}: the pickup height is the snow's`);
  ok(zone.pickup.radius === 12 && zone.pickup.z > 0, `${id}: a 12 m pickup circle below the drop`);
  ok(zone.drop.y > zone.pickup.y, `${id}: the pickup is downhill`);
  // Finite everywhere over its bounds, and the same twice.
  const b = zone.bounds;
  for (let x = b.minX; x <= b.maxX; x += (b.maxX - b.minX) / 6) {
    for (let z = b.minZ; z <= b.maxZ; z += (b.maxZ - b.minZ) / 40) {
      const h = zone.ground(x, z);
      if (!Number.isFinite(h) || h !== zone.ground(x, z)) assert.fail(`${id}: bad snow at ${x}, ${z}`);
    }
  }
  checks++;
  // Everything the player meets is inside the bounds.
  const inside = p => p.x >= b.minX && p.x <= b.maxX && p.z >= b.minZ && p.z <= b.maxZ;
  ok(zone.line.every(inside) && inside(zone.pickup) && zone.stashes.every(inside) && zone.gates.every(g => inside(g.left) && inside(g.right)), `${id}: line, gates, stashes and pickup are inside the bounds`);
  ok(zone.line[0].x === 0 && zone.line[0].z === 0, `${id}: the line starts at the drop pad`);
}
// The altitudes are the Summit world's: the pads' real heights, read the way the helicopter reads them.
same([skiZone('slalom').drop.y, skiZone('gs').drop.y, skiZone('moguls').drop.y], [SKI_ALTITUDES.devils, SKI_ALTITUDES.devils, SKI_ALTITUDES.devils], 'slalom, giant slalom and moguls drop from the Devils pad\'s altitude');
same(skiZone('powder').drop.y, SKI_ALTITUDES.summit, 'powder drops from the summit pad\'s altitude');
near(skiZone('aerials').pickup.y, SKI_ALTITUDES.pickup, 1e-6, 'aerials ends at the pickup pad\'s altitude');
near(SKI_ALTITUDES.summit, 3586, 1, 'the summit pad is at 3,586 m');
same(['slalom', 'gs', 'moguls', 'aerials', 'powder'].map(id => skiZone(id).world.pad), ['devils', 'devils', 'devils', 'pickup', 'summit'], 'each zone launches from its pad');
near(skiZone('gs').ground(0, 1100), SKI_ALTITUDES.pickup, 5, 'the giant slalom ends about where the pickup pad is');
near(skiZone('powder').ground(0, POWDER_SHAPE.length), SKI_ALTITUDES.pickup, 0.5, 'and the powder bowl falls to the pickup pad\'s altitude');

// ---- The pads are real landing circles in the Summit Run world --------------------
{
  const course = new Course(ALL_CIRCUITS.find(def => def.id === 'summit-run'), 1989);
  const ground = groundFromCourse(course);
  for (const [name, pad] of Object.entries(SUMMIT_PADS)) {
    ok(clearCircle(course, ground, pad.x, pad.z, 12, 1.5), `${name} pad: a clear 12 m circle, level within 1.5 m`);
    near(ground.height(pad.x, pad.z), pad.y, 1.5, `${name} pad: its height matches the Summit world`);
  }
  for (const id of SKI_RUN_IDS) {
    const world = skiZone(id).world;
    same([world.x, world.z, world.y], [SUMMIT_PADS[world.pad].x, SUMMIT_PADS[world.pad].z, SUMMIT_PADS[world.pad].y], `${id}: its world pad is ${world.pad}`);
  }
  // The summit pad is the highest clear circle the world has (found beside the road every 40 m).
  let highest = -Infinity;
  for (let s = 0; s < course.length; s += 40) {
    for (const lateral of [30, -30, 45, -45, 60, -60, 80, -80]) {
      const p = course.worldAt(course.phase(s), lateral), y = ground.height(p.x, p.z);
      if (y > highest && clearCircle(course, ground, p.x, p.z, 12, 1.5)) highest = y;
    }
  }
  near(SUMMIT_PADS.summit.y, highest, 1.5, 'the summit pad is the highest clear circle in the Summit world');
  near(SUMMIT_PADS.summit.y - SUMMIT_PADS.devils.y, 342, 10, 'the Summit world has about the packet\'s 342 m between the pads');
  near(SUMMIT_PADS.devils.y - SUMMIT_PADS.pickup.y, 350, 10, 'and about its 350 m down to the pickup');
  // One world: the altitude is read as every Summit flight reads it.
  same([SUMMIT_BASE_ALTITUDE, SUMMIT_START_Y], [SUMMIT_RUN.baseAltitude, course.at(0).y], 'the base altitude and the start height are the Summit world\'s');
  near(altitudeOf(SUMMIT_PADS.summit.y), SUMMIT_RUN.baseAltitude - course.at(0).y + SUMMIT_PADS.summit.y, 1e-9, 'a pad\'s altitude is the course\'s base plus its height above the start');
  // The thin-air numbers the packet quotes (section 3), from the helicopter's own thrust rule.
  const thrustKg = altitude => KESTREL.maxThrust / 9.81 * airFactor(altitude);
  const group = 5 * 95, weight = tank => KESTREL.emptyKg + KESTREL.pilotKg + tank + group;
  near(thrustKg(SKI_ALTITUDES.summit), 2217, 3, 'most thrust at the summit pad: 2,217 kg');
  near(thrustKg(SKI_ALTITUDES.devils), 2310, 3, 'at the Devils pad: 2,310 kg');
  ok(weight(400) === 2105 && weight(200) === 1905, 'a guide and four guests (95 kg each) weigh 2,105 kg on a full tank, 1,905 kg on half');
  ok(thrustKg(SKI_ALTITUDES.summit) > weight(400), 'the full group hovers at the summit pad on a full tank (so the packet\'s "take half a tank" lesson does not hold here)');
}

// ---- Slalom and giant slalom ---------------------------------------------------------
for (const [id, gates, length, drop, spacing] of [['slalom', 50, 450, 180, [8, 9]], ['gs', 40, 1100, 350, [25, 27]]]) {
  const zone = skiZone(id), guide = zoneGuide(id);
  same(zone.gates.length, gates, `${id}: ${gates} gates`);
  near(zone.finish.left.z, length, 0.5, `${id}: ${length} m long`);
  near(zone.ground(0, 0) - zone.ground(0, length), drop, 0.5, `${id}: ${drop} m of drop`);
  ok(zone.gates.every((g, i) => i === 0 || (g.left.z - zone.gates[i - 1].left.z >= spacing[0] && g.left.z - zone.gates[i - 1].left.z <= spacing[1])), `${id}: gates ${spacing[0]} to ${spacing[1]} m apart`);
  ok(zone.gates.every((g, i) => g.colour === (i % 2 ? 'blue' : 'red') && g.dir.z === 1), `${id}: red and blue poles in turn`);
  ok(zone.gates.every((g, i) => i === 0 || Math.sign(g.centre) !== Math.sign(zone.gates[i - 1].centre)), `${id}: each gate is on the other side of the last`);
  ok(zone.start.left.z < zone.gates[0].left.z && zone.gates[gates - 1].left.z < zone.finish.left.z, `${id}: start, gates, finish in order`);
  // The guide skis it start to finish through every gate.
  const run = createTimedRun({start: zone.start, finish: zone.finish, gates: zone.gates});
  const full = guideOf(zone);
  const events = [];
  for (let i = 1; i < full.ghost.length; i++) events.push(...stepTimedRun(run, full.ghost[i - 1], full.ghost[i], SKI_STEP));
  ok(run.finished && run.passed === gates && run.missed === 0, `${id}: the guide skis through all ${gates} gates and finishes`);
  same(events.filter(e => e.type === 'skiGate').map(e => e.passed).every(Boolean), true, `${id}: every gate says passed`);
  same(full.tumbles, 0, `${id}: the guide never tumbles`);
  ok(full.maxSide < 1.5, `${id}: the guide stays on its line (${full.maxSide.toFixed(2)} m)`);
  // The timed run's clock is the guide's best run to within a step or two of the line crossings.
  near(run.clock, full.bestTime - 0, full.bestTime, `${id}: a clock ran`);
  ok(run.clock > 0.9 * full.bestTime - 3 && run.clock < full.bestTime, `${id}: from the start line to the finish line (${run.clock.toFixed(1)} s of ${full.bestTime.toFixed(1)} s)`);
  near(guide.time, full.time, 1e-6, `${id}: the cached guide is the same run`);
  const limits = medalLimits(id);
  same([limits.kind, limits.gold, limits.silver / limits.gold, limits.bronze / limits.gold], ['time', guide.time, 1.08, 1.18], `${id}: medal times from the guide`);
  same([timedMedal(guide.time, guide.time), timedMedal(guide.time * 1.05, guide.time), timedMedal(guide.time * 1.15, guide.time), timedMedal(guide.time * 1.25, guide.time)], [3, 2, 1, 0], `${id}: gold, silver, bronze, none`);
  // A skier who ignores the gates and skis straight down the middle misses them all: each opening is to one side.
  const straight = createTimedRun({start: zone.start, finish: zone.finish, gates: zone.gates});
  const skier = createSkier({world: zone, x: 0, z: 0});
  let last = {x: skier.x, z: skier.z};
  for (let i = 0; i < 120 * 200 && !straight.finished; i++) {
    stepSkier(skier, {tuck: true, skate: true}, zone);
    stepTimedRun(straight, last, skier, SKI_STEP);
    last = {x: skier.x, z: skier.z};
  }
  same([straight.finished, straight.missed], [true, gates], `${id}: straight down the middle misses every gate`);
}
ok(zoneGuide('slalom').time < zoneGuide('gs').time && zoneGuide('slalom').time > 10, 'the slalom is quicker than the giant slalom');

// ---- Moguls ---------------------------------------------------------------------------
{
  const zone = skiZone('moguls');
  near(angleBetween(zone, 30, 90), 28, 0.5, 'moguls: 28 degrees');
  near(angleBetween(zone, 110, 170, 5), 28, 0.5, 'moguls: and 28 degrees beside the line');
  ok(zone.finish.left.z - zone.start.left.z >= 240 && zone.finish.left.z <= 250, 'moguls: 250 m of run');
  // Bumps every 3.5 to 4 m, in two lines.
  const lines = [zone.bumps.filter(b => b.x > 0), zone.bumps.filter(b => b.x < 0)];
  same(lines.map(l => l[0].x), [MOGUL_SHAPE.lines.x, -MOGUL_SHAPE.lines.x], 'moguls: two lines of bumps');
  for (const line of lines) {
    const gaps = line.slice(1).map((b, i) => b.z - line[i].z);
    ok(gaps.length > 40 && gaps.every(gap => gap > 3.4 && (gap < 4.1 || gap > 8)), 'moguls: bumps 3.5 to 4 m apart (only the kickers break the line)');
    ok(line.every(b => b.z >= MOGUL_SHAPE.lines.from && b.z <= MOGUL_SHAPE.lines.to), 'moguls: all bumps inside the run');
  }
  ok(zone.bumps.length > 90, `moguls: ${zone.bumps.length} bumps`);
  // The bumps show in the snow: a bump's top is above the smooth slope.
  const b = zone.bumps[5];
  ok(zone.ground(b.x, b.z) - (zone.ground(b.x, b.z - 6) - 6 * Math.tan(28 * DEG)) > 0.3, 'moguls: a bump stands 0.3 m or more out of the slope');
  // Two small kickers in the line, inside the run.
  same(zone.kickers.length, 2, 'moguls: two kickers');
  ok(zone.kickers.every(k => k.z > 30 && k.z < 220 && Math.abs(k.x) < 0.1), 'moguls: on the centre line, inside the run');
  // The guide skis it, jumps both kickers and lands clean.
  const guide = guideOf(zone);
  same(guide.tumbles, 0, 'moguls: the guide never tumbles');
  ok(guide.maxSide < 2, `moguls: the guide stays on the bump line (${guide.maxSide.toFixed(2)} m)`);
  ok(guide.landings.length >= 2 && guide.landings.every(l => l.safe) && guide.landings.some(l => l.airTime > 0.5), 'moguls: the guide jumps the kickers and lands clean every time');
  ok(guide.ghost[guide.ghost.length - 1].z > 248, 'moguls: and reaches the bottom');
  // A perfect run scores 100: every turn, a spin off each kicker, the guide's time.
  const config = judgedConfig('moguls');
  near(config.guideTime, zoneGuide('moguls').time, 1e-9, 'moguls: speed is judged against the guide');
  same([config.turnsPlanned, config.jumps], [17, 2], 'moguls: 17 turns planned, two jumps');
  const run = createJudgedRun('moguls', config);
  for (let i = 0; i < config.turnsPlanned; i++) stepJudgedRun(run, {edge: i % 2 ? -50 : 50, speed: 10, grounded: true, tumbling: false}, [], 0.1);
  for (let i = 0; i < 2; i++) stepJudgedRun(run, {edge: 0, speed: 10, grounded: true}, [{type: 'skiLand', safe: true, spinMax: 360, flipMax: 0, angle: 5}], 0.1);
  run.clock = config.guideTime;
  near(finishJudgedRun(run).total, 100, 1e-9, 'moguls: all turns, two whole spins, the guide\'s time: 100');
  same(medalLimits('moguls'), {kind: 'points', ...SCORE.judgedMedals}, 'moguls: judged medals');
}

// ---- Aerials --------------------------------------------------------------------------
{
  const zone = skiZone('aerials'), a = AERIALS_SHAPE;
  const lip = a.inrun + a.ramp + a.ease;
  // The kicker's face climbs at 64 degrees, the landing hill falls at 37.
  let steepest = 0;
  for (let z = a.inrun; z < lip; z += 0.25) steepest = Math.max(steepest, Math.atan2(zone.ground(0, z) - zone.ground(0, z + 0.25), 0.25) / DEG * -1);
  near(steepest, 64, 1.5, 'aerials: the kicker face is 64 degrees');
  near(angleBetween(zone, lip + 15, lip + 55), 37, 0.5, 'aerials: the landing hill is 37 degrees');
  near(angleBetween(zone, 5, 35), a.inrunAngle, 0.5, 'aerials: the inrun is steady');
  same(zone.safePathAngle, 40, 'aerials: the landing hill judges against 40 degrees');
  same(zone.kickers, [{x: 0, z: lip}], 'aerials: one kicker');
  // It takes off at about 50 degrees (Claude, 24 October 2026).
  {
    const skier = createSkier({world: zone});
    while (skier.grounded && skier.time < 30) stepSkier(skier, {tuck: true, skate: true}, zone);
    const takeoff = Math.atan2(skier.vy, Math.hypot(skier.vx, skier.vz)) / DEG;
    ok(takeoff > 40 && takeoff < 60, `aerials: takes off at about 50 degrees (${takeoff.toFixed(0)})`);
  }
  // The guide's jump is safe, big and slow enough to turn in.
  const guide = zoneGuide('aerials');
  same(guide.landings.length, 1, 'aerials: the guide takes one jump');
  const land = guide.landings[0];
  ok(land.safe && land.angle <= 40, `aerials: the guide's landing is safe (${land.angle.toFixed(1)} degrees to the snow)`);
  ok(land.height > 4 && land.distance > 8 && land.airTime > 1.5, `aerials: ${land.height.toFixed(1)} m high, ${land.distance.toFixed(1)} m long, ${land.airTime.toFixed(2)} s in the air`);
  ok(land.angle > SKI.safePathAngle / DEG, 'aerials: the same landing would tumble under the usual 20 degrees');
  const strict = guideRun({line: zone.line, world: {ground: zone.ground}});
  same(strict.tumbles, 1, 'aerials: and it does, without the hill\'s window');
  // A drop onto the flat still tumbles under the wider window.
  const cliff = {ground: (x, z) => z < 0 ? 3000 - Math.tan(30 * DEG) * z : 2994, safePathAngle: 40};
  const faller = createSkier({world: cliff, z: -30, speed: 15});
  const dropped = [];
  while (!dropped.some(e => e.type === 'skiLand') && faller.time < 10) dropped.push(...stepSkier(faller, {}, cliff));
  ok(!dropped.find(e => e.type === 'skiLand').safe, 'aerials: a drop onto the flat is still a tumble');
  // A skier turning a whole spin in the air lands clean and scores a gold; one who does not scores less.
  const jump = spin => {
    const skier = createSkier({world: zone});
    const events = [];
    for (let i = 0; i < 120 * 30 && !events.some(e => e.type === 'skiLand'); i++) {
      events.push(...stepSkier(skier, {tuck: skier.grounded, skate: true, turn: !skier.grounded && skier.air.time < spin ? 1 : 0}, zone));
    }
    return events.find(e => e.type === 'skiLand');
  };
  const score = landing => {
    const run = createJudgedRun('aerials', judgedConfig('aerials'));
    stepJudgedRun(run, {edge: 0, speed: 10, grounded: true}, [landing], 0.1);
    return finishJudgedRun(run);
  };
  const whole = jump(1), none = jump(0), half = jump(0.5);
  ok(whole.safe && Math.abs(whole.spin - 360) < 5, 'aerials: a whole spin off the kicker lands clean');
  ok(!half.safe, 'aerials: half a spin lands backwards and tumbles');
  const spun = score(whole), plain = score(none), fell = score(half);
  ok(spun.medal === 3 && spun.points >= 80, `aerials: a whole spin is a gold (${spun.points})`);
  ok(plain.medal === 1 && plain.points < spun.points, `aerials: no spin is a bronze (${plain.points})`);
  ok(fell.landing === 0 && fell.medal <= 1, `aerials: a tumble scores nothing on landing (${fell.points})`);
}

// ---- Powder ---------------------------------------------------------------------------
{
  const zone = skiZone('powder'), p = POWDER_SHAPE;
  near(zone.ground(0, 0) - zone.ground(0, p.length), SKI_ALTITUDES.summit - SKI_ALTITUDES.pickup, 0.5, 'powder: the bowl falls from the summit pad to the pickup pad\'s height');
  ok(zone.ground(100, 700) > zone.ground(0, 700) + 20 && zone.ground(-100, 700) > zone.ground(0, 700) + 20, 'powder: the sides rise: it is a bowl');
  same(zone.stashes.length, 3, 'powder: three stashes');
  ok(new Set(zone.stashes.map(s => s.id)).size === 3, 'powder: each its own');
  ok(zone.stashes.every(s => distanceToLine(zone.line, s.x, s.z) > 30 && s.radius === 9), 'powder: off the packed line, short fields');
  ok(zone.stashes.every(s => stashAt('powder', s.x, s.z) === s.id) && stashAt('powder', 0, 0) === null, 'powder: a stash is found by standing in it');
  // Deep snow off the packed line: friction 0.12 there, 0.05 on it.
  const line = zone.packed[0];
  near(zone.extraFriction(line[2].x, line[2].z) + SKI.snowFriction, SKI.snowFriction, 1e-9, 'powder: packed snow is the usual 0.05');
  near(zone.extraFriction(60, 300) + SKI.snowFriction, p.packedFriction, 1e-9, 'powder: deep snow off the packed line is 0.12');
  ok(zone.extraFriction(line[2].x + 4, line[2].z) > 0 && zone.extraFriction(line[2].x + 4, line[2].z) < 0.07, 'powder: it deepens over a few metres');
  // From the summit pad: down the packed line to the pickup.
  const direct = guideOf(zone);
  ok(atPickup('powder', direct.ghost[direct.ghost.length - 1].x, direct.ghost[direct.ghost.length - 1].z), 'powder: the packed line reaches the pickup circle');
  same(direct.tumbles, 0, 'powder: with no tumble');
  // Any way down: through every stash, then to the pickup, over the deep snow.
  const wander = [{x: 0, z: 0}, ...zone.stashes.flatMap(s => [{x: s.x, z: s.z - 40}, {x: s.x, z: s.z}]), {x: 0, z: 1250}, {x: zone.pickup.x, z: zone.pickup.z}];
  const tour = guideRun({line: wander, world: zone, sampleEvery: 1});
  const best = id => Math.min(...tour.ghost.map(point => Math.hypot(point.x - zone.stashes.find(s => s.id === id).x, point.z - zone.stashes.find(s => s.id === id).z)));
  ok(zone.stashes.every(s => best(s.id) <= s.radius), `powder: a run through every stash (${zone.stashes.map(s => best(s.id).toFixed(1)).join(', ')} m from their centres)`);
  const end = tour.ghost[tour.ghost.length - 1];
  ok(atPickup('powder', end.x, end.z), 'powder: and on to the pickup');
  ok(tour.time < 240 && tour.time > direct.time, `powder: the tour takes ${tour.time.toFixed(0)} s, longer than the packed line's ${direct.time.toFixed(0)} s`);
  same(tour.tumbles, 0, 'powder: with no tumble');
  // Deep snow slows you: two seconds from the packed line are faster than the same two beside it.
  const onLine = {x: line[2].x + (line[3].x - line[2].x) * (600 - line[2].z) / (line[3].z - line[2].z), z: 600};
  near(zone.extraFriction(onLine.x, onLine.z), 0, 1e-9, 'powder: the point is on the packed line');
  const speedAt = x => {
    const skier = createSkier({world: zone, x, z: 600, heading: 0, speed: 12});
    for (let i = 0; i < 120 * 2; i++) stepSkier(skier, {tuck: true}, zone);
    return skier.speed;
  };
  ok(speedAt(onLine.x) > speedAt(onLine.x + 40) + 0.5, 'powder: deep snow slows you');
  // Nothing in the zone is a course: no gates, no clock, no medals.
  same([zone.gates.length, zone.start, zone.finish, medalLimits('powder'), zoneGuide('powder')], [0, null, null, null, null], 'powder: not timed, no medals');
}

console.log(`PASS SKI-RUNS: the five Summit Run zones (${checks} checks)`);
